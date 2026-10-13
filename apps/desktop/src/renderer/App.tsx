import { AgentAvatar, type AvatarStatus } from "@stave/avatar";
import {
  type BoardWorkStage,
  defaultTicketPriority,
  defaultTicketType,
  type ProjectBoardSettings,
  type TicketPriority,
  type TicketType,
  ticketPriorities,
  ticketTypes,
} from "@stave/domain";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import type {
  DesktopAgentRole,
  TicketSnapshot,
  WorkspaceSnapshot,
} from "../shared/workspace-snapshot";
import { AvatarLab } from "./AvatarLab";
import { type ChatChannelId, ChatView } from "./ChatView";

type WorkspaceState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly snapshot: WorkspaceSnapshot };

type WorkspaceAction =
  | { readonly type: "snapshot"; readonly snapshot: WorkspaceSnapshot }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "retry" };

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "snapshot":
      return state.status === "ready" &&
        state.snapshot.revision > action.snapshot.revision
        ? state
        : { status: "ready", snapshot: action.snapshot };
    case "error":
      return state.status === "ready"
        ? state
        : { status: "error", message: action.message };
    case "retry":
      return { status: "loading" };
  }
}

const stages: readonly {
  readonly id: TicketSnapshot["stage"];
  readonly label: string;
}[] = [
  { id: "todo", label: "To do" },
  { id: "implementation", label: "Building" },
  { id: "review", label: "Review" },
  { id: "qa", label: "QA" },
  { id: "done", label: "Done" },
];

const executionLabels: Record<TicketSnapshot["execution"], string> = {
  ready: "Ready to start",
  running: "Running",
  succeeded: "Completed",
  failed: "Failed",
  canceled: "Canceled",
  interrupted: "Interrupted",
  waiting_capacity: "Waiting for capacity",
  waiting_user: "Needs your input",
};

const roleLabels: Record<DesktopAgentRole, string> = {
  tech_lead: "Tech lead",
  engineer: "Engineer",
  qa: "Quality assurance",
};

const ticketTypeLabels: Record<TicketType, string> = {
  task: "Task",
  bug: "Bug",
  feature: "Feature",
  chore: "Chore",
  research: "Research",
};

const ticketTypeGlyphs: Record<TicketType, string> = {
  task: "□",
  bug: "◇",
  feature: "✦",
  chore: "⌁",
  research: "⌕",
};

const ticketPriorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function avatarStatus(ticket: TicketSnapshot | undefined): AvatarStatus {
  if (!ticket) return "idle";
  switch (ticket.execution) {
    case "ready":
      return "idle";
    case "running":
      return ticket.stage === "implementation" ? "working" : "reviewing";
    case "succeeded":
      return "done";
    case "failed":
      return "failed";
    case "canceled":
      return "idle";
    case "interrupted":
      return "blocked";
    case "waiting_capacity":
      return "queued";
    case "waiting_user":
      return "waiting";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function Modal({
  open,
  className,
  labelledBy,
  onClose,
  children,
}: {
  readonly open: boolean;
  readonly className: string;
  readonly labelledBy: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={onClose}
      onClose={onClose}
    >
      {children}
    </dialog>
  );
}

export function App() {
  const [view, setView] = useState<"board" | "chat" | "avatars">("board");
  const [workspace, dispatch] = useReducer(workspaceReducer, {
    status: "loading",
  });
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [projectName, setProjectName] = useState("");
  const [repositoryPath, setRepositoryPath] = useState("");
  const [repositoryDraft, setRepositoryDraft] = useState<string | null>(null);
  const [preparingTicketId, setPreparingTicketId] = useState<string | null>(
    null,
  );
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>(defaultTicketType);
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>(
    defaultTicketPriority,
  );
  const [ticketPoints, setTicketPoints] = useState("");
  const [ticketEpic, setTicketEpic] = useState("");
  const [ticketLabels, setTicketLabels] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedChatAgentId, setSelectedChatAgentId] = useState<string | null>(
    null,
  );
  const [selectedChatTicketId, setSelectedChatTicketId] = useState<
    string | null
  >(null);
  const [selectedChatChannel, setSelectedChatChannel] =
    useState<ChatChannelId>("team");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardSettingsDraft, setBoardSettingsDraft] =
    useState<ProjectBoardSettings | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<
    ReadonlySet<"todo" | "done">
  >(() => new Set(["todo", "done"]));
  const [needsOpen, setNeedsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSettingsOpen(false);
        setNeedsOpen(false);
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: bumping retry re-subscribes after a failed load.
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    const accept = (snapshot: WorkspaceSnapshot) => {
      if (!disposed) dispatch({ type: "snapshot", snapshot });
    };
    const fail = (cause: unknown) => {
      if (!disposed) dispatch({ type: "error", message: errorMessage(cause) });
    };
    try {
      unsubscribe = window.stave.events.subscribe((event) =>
        accept(event.snapshot),
      );
      void window.stave.workspace.getSnapshot().then(accept, fail);
    } catch (cause) {
      fail(cause);
    }
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [retry]);

  async function command(
    key: string,
    perform: () => Promise<WorkspaceSnapshot>,
    onSuccess?: () => void,
  ) {
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    setPending(new Set(pendingRef.current));
    setError(null);
    try {
      const snapshot = await perform();
      dispatch({ type: "snapshot", snapshot });
      onSuccess?.();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      pendingRef.current.delete(key);
      setPending(new Set(pendingRef.current));
    }
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const path = repositoryPath.trim();
    void command("project", () =>
      window.stave.projects.create({
        name: projectName.trim(),
        ...(path ? { repositoryPath: path } : {}),
      }),
    );
  }

  function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void command(
      "ticket",
      () =>
        window.stave.tickets.create({
          title: ticketTitle.trim(),
          description: ticketDescription.trim(),
          type: ticketType,
          priority: ticketPriority,
          points: ticketPoints.trim() ? Number(ticketPoints) : null,
          epic: ticketEpic.trim() || null,
          labels: ticketLabels
            .split(",")
            .map((label) => label.trim())
            .filter(Boolean),
        }),
      () => {
        setTicketTitle("");
        setTicketDescription("");
        setTicketType(defaultTicketType);
        setTicketPriority(defaultTicketPriority);
        setTicketPoints("");
        setTicketEpic("");
        setTicketLabels("");
        setTicketFormOpen(false);
      },
    );
  }

  function saveRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const path = repositoryDraft ?? project?.repositoryPath ?? "";
    void command(
      "repository",
      () =>
        window.stave.projects.setRepository({ repositoryPath: path.trim() }),
      () => setRepositoryDraft(null),
    );
  }

  function openSettings() {
    if (project) setBoardSettingsDraft(project.boardSettings);
    setSettingsOpen(true);
  }

  function saveBoardSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!boardSettingsDraft) return;
    void command("board-settings", () =>
      window.stave.projects.setBoardSettings({ settings: boardSettingsDraft }),
    );
  }

  function updateWipLimit(stage: BoardWorkStage, limit: number) {
    setBoardSettingsDraft((current) =>
      current
        ? { ...current, wipLimits: { ...current.wipLimits, [stage]: limit } }
        : current,
    );
  }

  function toggleRail(stage: "todo" | "done") {
    setCollapsedStages((current) => {
      const next = new Set(current);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  async function prepareWorkspace(ticket: TicketSnapshot) {
    if (pendingRef.current.has(ticket.id) || preparingTicketId) return;
    setPreparingTicketId(ticket.id);
    try {
      await command(ticket.id, () =>
        window.stave.workspaces.prepare({ ticketId: ticket.id }),
      );
    } finally {
      setPreparingTicketId(null);
    }
  }

  const snapshot = workspace.status === "ready" ? workspace.snapshot : null;
  const project = snapshot?.project;
  const selectedTicket = snapshot?.tickets.find(
    (ticket) => ticket.id === selectedTicketId,
  );
  const selectedChatAgent = project?.agents.find(
    (agent) => agent.id === selectedChatAgentId,
  );
  const selectedChatTicket = snapshot?.tickets.find(
    (ticket) => ticket.id === selectedChatTicketId,
  );
  const selectedRun = snapshot?.runs.find(
    (run) => run.id === selectedTicket?.runId,
  );
  const activeCount =
    snapshot?.tickets.filter((ticket) => ticket.execution === "running")
      .length ?? 0;
  const hasWorkspaces =
    snapshot?.tickets.some((ticket) => ticket.workspace !== null) ?? false;
  const repositoryLocked =
    hasWorkspaces ||
    activeCount > 0 ||
    preparingTicketId !== null ||
    pending.has("repository") ||
    (snapshot?.tickets.some((ticket) => pending.has(ticket.id)) ?? false);
  const waitingTickets =
    snapshot?.tickets.filter((ticket) => ticket.execution === "waiting_user") ??
    [];
  const normalizedCommandQuery = commandQuery.trim().toLocaleLowerCase();
  const matchesCommand = (label: string) =>
    !normalizedCommandQuery ||
    label.toLocaleLowerCase().includes(normalizedCommandQuery);

  function closeCommandMenu() {
    setCommandOpen(false);
    setCommandQuery("");
  }

  function openCommandMenu() {
    setSettingsOpen(false);
    setNeedsOpen(false);
    setCommandOpen(true);
  }

  function showBoard() {
    setView("board");
    setSettingsOpen(false);
    setNeedsOpen(false);
    closeCommandMenu();
  }

  function showChat() {
    setSelectedChatAgentId(null);
    setSelectedChatTicketId(null);
    setSelectedChatChannel("team");
    setView("chat");
    setSettingsOpen(false);
    setNeedsOpen(false);
    closeCommandMenu();
  }

  function showAgent(agentId: string) {
    setSelectedChatAgentId(agentId);
    setSelectedChatTicketId(null);
    setView("chat");
    setSettingsOpen(false);
    setNeedsOpen(false);
    closeCommandMenu();
  }

  function showChatChannel(channel: ChatChannelId) {
    setSelectedChatAgentId(null);
    setSelectedChatTicketId(null);
    setSelectedChatChannel(channel);
    setView("chat");
    setSettingsOpen(false);
    setNeedsOpen(false);
    closeCommandMenu();
  }

  function showTicketThread(ticketId: string) {
    setSelectedChatAgentId(null);
    setSelectedChatTicketId(ticketId);
    setView("chat");
    setSettingsOpen(false);
    setNeedsOpen(false);
    closeCommandMenu();
  }

  function showTicket(ticketId: string) {
    setSelectedTicketId(ticketId);
    setView("board");
    setSettingsOpen(false);
    closeCommandMenu();
    setNeedsOpen(false);
  }

  function showTicketForm() {
    setView("board");
    setSelectedTicketId(null);
    setSettingsOpen(false);
    setNeedsOpen(false);
    setTicketFormOpen(true);
    closeCommandMenu();
  }

  useEffect(() => {
    const createFromKeyboard = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (
        event.key.toLowerCase() !== "c" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditing ||
        view !== "board" ||
        !project ||
        settingsOpen ||
        needsOpen ||
        commandOpen ||
        selectedTicketId
      )
        return;
      event.preventDefault();
      setTicketFormOpen(true);
    };
    window.addEventListener("keydown", createFromKeyboard);
    return () => window.removeEventListener("keydown", createFromKeyboard);
  }, [commandOpen, needsOpen, project, selectedTicketId, settingsOpen, view]);

  function runControls(ticket: TicketSnapshot) {
    const busy = pending.has(ticket.id);
    if (ticket.execution === "running") {
      return (
        <button
          type="button"
          className="button button--small button--quiet"
          disabled={busy}
          onClick={() =>
            void command(ticket.id, () =>
              window.stave.runs.cancel({ ticketId: ticket.id }),
            )
          }
        >
          {busy ? "Canceling…" : "Cancel"}
        </button>
      );
    }
    if (ticket.stage === "done")
      return <span className="ticket-complete">✓ Complete</span>;
    const modes: readonly TicketSnapshot["mode"][] = project?.repositoryPath
      ? ["codex", "simulation"]
      : ["simulation"];
    return (
      <div className="run-options">
        {modes
          .filter((mode) => ticket.runId === null || ticket.mode === mode)
          .map((mode) => (
            <button
              key={mode}
              type="button"
              className={`button button--small ${mode === "codex" ? "button--primary" : "button--quiet"}`}
              disabled={
                busy ||
                preparingTicketId !== null ||
                pending.has("repository") ||
                activeCount > 0
              }
              onClick={() =>
                void command(ticket.id, () =>
                  window.stave.runs.start({ ticketId: ticket.id, mode }),
                )
              }
            >
              {preparingTicketId === ticket.id
                ? "Preparing…"
                : busy
                  ? "Starting…"
                  : mode === "codex"
                    ? "Run Codex"
                    : "Run simulation"}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
      </div>
    );
  }

  return (
    <>
      <header className="shell-titlebar">
        <nav className="shell-tabs" aria-label="Primary">
          <button
            type="button"
            className={view === "board" ? "is-active" : ""}
            aria-current={view === "board" ? "page" : undefined}
            onClick={showBoard}
          >
            Board
          </button>
          <button
            type="button"
            className={view === "chat" ? "is-active" : ""}
            aria-current={view === "chat" ? "page" : undefined}
            onClick={showChat}
          >
            Chat
          </button>
        </nav>
        <div className="shell-titlebar__actions">
          <button
            type="button"
            className="needs-button"
            onClick={() => setNeedsOpen(true)}
            aria-label={`${waitingTickets.length} need you`}
          >
            {waitingTickets.length > 0 && (
              <span className="needs-button__dot" aria-hidden="true" />
            )}
            {waitingTickets.length} need you
          </button>
          <button
            type="button"
            className="command-button"
            onClick={openCommandMenu}
            aria-label="Open command menu"
          >
            <span>Search or jump</span>
            <kbd>⌘K</kbd>
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={openSettings}
            aria-label="Open settings"
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>
      {view === "avatars" ? (
        <AvatarLab />
      ) : (
        <main
          className={`shell-content${selectedTicket && view === "board" ? " shell-content--inspector-open" : ""}`}
        >
          {error && !selectedTicket && (
            <div className="notice notice--error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="text-button"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
          {workspace.status === "loading" && (
            <section className="workspace-status" role="status">
              <span className="loading-dot" />
              <h1>Opening your workspace…</h1>
              <p>Bringing your team and tickets together.</p>
            </section>
          )}
          {workspace.status === "error" && (
            <section className="workspace-status" role="alert">
              <p className="eyebrow">Workspace unavailable</p>
              <h1>Let's try that again.</h1>
              <p>{workspace.message}</p>
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  dispatch({ type: "retry" });
                  setRetry((value) => value + 1);
                }}
              >
                Retry
              </button>
            </section>
          )}
          {snapshot && !project && (
            <section className="setup-view" aria-labelledby="setup-title">
              <form className="project-form" onSubmit={createProject}>
                <p className="eyebrow">Local workspace</p>
                <h1 id="setup-title">Set up your board</h1>
                <p className="setup-view__copy">
                  Name the project and optionally connect a local Git
                  repository. Nothing leaves this computer.
                </p>
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="Something worth building"
                  required
                  maxLength={120}
                  disabled={pending.has("project")}
                />
                <label htmlFor="repository-path">
                  Repository path <span>Optional</span>
                </label>
                <input
                  id="repository-path"
                  value={repositoryPath}
                  onChange={(event) => setRepositoryPath(event.target.value)}
                  placeholder="/Users/you/projects/your-project"
                  disabled={pending.has("project")}
                />
                <p className="field-hint">
                  Use an existing local Git repository, or leave this empty to
                  explore.
                </p>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={pending.has("project") || !projectName.trim()}
                >
                  {pending.has("project")
                    ? "Creating project..."
                    : "Create project"}
                </button>
              </form>
            </section>
          )}
          {snapshot && project && (
            <>
              {view === "board" && (
                <header className="board-page__header">
                  <div>
                    <p className="eyebrow">Local delivery board</p>
                    <h1>{project.name}</h1>
                    <p>
                      {project.repositoryPath ??
                        "Simulation workspace · no repository connected"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => setTicketFormOpen((open) => !open)}
                    aria-expanded={ticketFormOpen}
                    aria-controls="ticket-form"
                  >
                    {ticketFormOpen ? "Close ticket form" : "Add ticket"}
                    <span aria-hidden="true">{ticketFormOpen ? "−" : "+"}</span>
                  </button>
                </header>
              )}
              {view === "chat" ? (
                <ChatView
                  snapshot={snapshot}
                  agents={project.agents}
                  channel={selectedChatChannel}
                  ticketId={selectedChatTicket ? selectedChatTicket.id : null}
                  agentId={selectedChatAgent ? selectedChatAgent.id : null}
                  onSelectChannel={showChatChannel}
                  onSelectTicket={showTicketThread}
                  onSelectAgent={showAgent}
                  onSendMessage={(text) =>
                    command("chat-message", () =>
                      window.stave.chat.send({
                        text,
                        channel: selectedChatTicketId
                          ? "ticket"
                          : selectedChatAgentId
                            ? "direct"
                            : selectedChatChannel,
                        ...(selectedChatTicketId
                          ? { ticketId: selectedChatTicketId }
                          : {}),
                        ...(selectedChatAgentId
                          ? { agentId: selectedChatAgentId }
                          : {}),
                      }),
                    )
                  }
                />
              ) : (
                <section className="delivery" aria-labelledby="delivery-title">
                  <h2 id="delivery-title" className="visually-hidden">
                    Ticket board
                  </h2>
                  <p className="simulation-note">
                    {project.repositoryPath
                      ? "Codex works in an isolated local workspace. Simulation previews the workflow without code changes."
                      : "Simulation previews implementation, review, and QA. Connect a repository in Settings to run Codex."}
                  </p>
                  {ticketFormOpen && (
                    <form
                      id="ticket-form"
                      className="ticket-form"
                      onSubmit={createTicket}
                    >
                      <div>
                        <label htmlFor="ticket-title">Ticket title</label>
                        <input
                          id="ticket-title"
                          value={ticketTitle}
                          onChange={(event) =>
                            setTicketTitle(event.target.value)
                          }
                          placeholder="What should the team work on?"
                          required
                          maxLength={200}
                          // biome-ignore lint/a11y/noAutofocus: the form opens in response to the user asking to add a ticket.
                          autoFocus
                          disabled={pending.has("ticket")}
                        />
                      </div>
                      <div>
                        <label htmlFor="ticket-description">Description</label>
                        <textarea
                          id="ticket-description"
                          value={ticketDescription}
                          onChange={(event) =>
                            setTicketDescription(event.target.value)
                          }
                          placeholder="Describe the outcome and how you'll know it's done."
                          rows={3}
                          disabled={pending.has("ticket")}
                        />
                      </div>
                      <fieldset className="ticket-form__metadata">
                        <legend>Ticket details</legend>
                        <label
                          className="ticket-form__field"
                          htmlFor="ticket-type"
                        >
                          <span>Type</span>
                          <select
                            id="ticket-type"
                            value={ticketType}
                            onChange={(event) =>
                              setTicketType(event.target.value as TicketType)
                            }
                            disabled={pending.has("ticket")}
                          >
                            {ticketTypes.map((type) => (
                              <option key={type} value={type}>
                                {ticketTypeLabels[type]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label
                          className="ticket-form__field"
                          htmlFor="ticket-priority"
                        >
                          <span>Priority</span>
                          <select
                            id="ticket-priority"
                            value={ticketPriority}
                            onChange={(event) =>
                              setTicketPriority(
                                event.target.value as TicketPriority,
                              )
                            }
                            disabled={pending.has("ticket")}
                          >
                            {ticketPriorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {ticketPriorityLabels[priority]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label
                          className="ticket-form__field"
                          htmlFor="ticket-points"
                        >
                          <span>Points</span>
                          <input
                            id="ticket-points"
                            type="number"
                            min={1}
                            max={100}
                            step={1}
                            value={ticketPoints}
                            onChange={(event) =>
                              setTicketPoints(event.target.value)
                            }
                            placeholder="—"
                            disabled={pending.has("ticket")}
                          />
                        </label>
                        <label
                          className="ticket-form__field"
                          htmlFor="ticket-epic"
                        >
                          <span>Epic</span>
                          <input
                            id="ticket-epic"
                            value={ticketEpic}
                            maxLength={120}
                            onChange={(event) =>
                              setTicketEpic(event.target.value)
                            }
                            placeholder="Optional epic"
                            disabled={pending.has("ticket")}
                          />
                        </label>
                        <label
                          className="ticket-form__field ticket-form__field--labels"
                          htmlFor="ticket-labels"
                        >
                          <span>Labels</span>
                          <input
                            id="ticket-labels"
                            value={ticketLabels}
                            onChange={(event) =>
                              setTicketLabels(event.target.value)
                            }
                            placeholder="ui, accessibility"
                            disabled={pending.has("ticket")}
                          />
                          <small>Separate with commas</small>
                        </label>
                      </fieldset>
                      <button
                        type="submit"
                        className="button button--primary"
                        disabled={pending.has("ticket") || !ticketTitle.trim()}
                      >
                        {pending.has("ticket")
                          ? "Creating ticket..."
                          : "Create ticket"}
                      </button>
                    </form>
                  )}
                  {project.boardSettings.showNeedsLane &&
                    waitingTickets.length > 0 && (
                      <section className="needs-lane" aria-label="Needs you">
                        <div className="needs-lane__heading">
                          <span
                            className="needs-button__dot"
                            aria-hidden="true"
                          />
                          <h3>Needs you</h3>
                          <span>{waitingTickets.length}</span>
                        </div>
                        <div className="needs-lane__tickets">
                          {waitingTickets.map((ticket) => (
                            <button
                              type="button"
                              key={ticket.id}
                              onClick={() => setSelectedTicketId(ticket.id)}
                            >
                              <strong>{ticket.title}</strong>
                              <small>Waiting for your input</small>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  <section
                    className={`delivery-board${collapsedStages.has("todo") ? "" : collapsedStages.has("done") ? " delivery-board--todo-open" : " delivery-board--both-open"}${collapsedStages.has("done") ? "" : collapsedStages.has("todo") ? " delivery-board--done-open" : ""}`}
                    aria-label="Ticket board"
                  >
                    {stages.map((stage) => {
                      const tickets = snapshot.tickets.filter(
                        (ticket) => ticket.stage === stage.id,
                      );
                      const railStage =
                        stage.id === "todo" || stage.id === "done"
                          ? stage.id
                          : null;
                      const isRail = railStage !== null;
                      const isCollapsed = railStage
                        ? collapsedStages.has(railStage)
                        : false;
                      const limit =
                        stage.id === "todo" || stage.id === "done"
                          ? null
                          : project.boardSettings.wipLimits[stage.id];
                      const atLimit = limit !== null && tickets.length >= limit;
                      return (
                        <section
                          className={`board-column board-column--${stage.id}${isCollapsed ? " board-column--collapsed" : ""}`}
                          key={stage.id}
                          aria-label={stage.label}
                          id={`board-column-${stage.id}`}
                        >
                          {isCollapsed ? (
                            <button
                              type="button"
                              className="board-rail"
                              aria-label={`Expand ${stage.label}`}
                              aria-expanded="false"
                              aria-controls={`board-column-${stage.id}`}
                              onClick={() => {
                                if (railStage) toggleRail(railStage);
                              }}
                            >
                              <span className="board-rail__count">
                                {tickets.length}
                              </span>
                              <span className="board-rail__label">
                                {stage.label}
                              </span>
                            </button>
                          ) : (
                            <>
                              <div className="board-column__heading">
                                {isRail ? (
                                  <button
                                    type="button"
                                    className="board-column__fold"
                                    aria-expanded="true"
                                    aria-controls={`board-column-${stage.id}`}
                                    onClick={() => {
                                      if (railStage) toggleRail(railStage);
                                    }}
                                  >
                                    <span>{stage.label}</span>
                                    <span className="board-column__count">
                                      {tickets.length}
                                    </span>
                                  </button>
                                ) : (
                                  <>
                                    <h3>
                                      <span aria-hidden="true" />
                                      {stage.label}
                                    </h3>
                                    <span
                                      className={`board-column__wip${atLimit ? " board-column__wip--full" : ""}`}
                                    >
                                      {tickets.length}/{limit}
                                    </span>
                                  </>
                                )}
                              </div>
                              {!isRail && limit !== null && (
                                <div
                                  className={`board-column__progress board-column__progress--${stage.id}`}
                                  role="progressbar"
                                  aria-label={`${stage.label} WIP limit`}
                                  aria-valuemin={0}
                                  aria-valuemax={limit}
                                  aria-valuenow={Math.min(
                                    tickets.length,
                                    limit,
                                  )}
                                >
                                  <span
                                    style={{
                                      width: `${Math.min(tickets.length / limit, 1) * 100}%`,
                                    }}
                                  />
                                </div>
                              )}
                              <div className="board-column__tickets">
                                {tickets.length === 0 && (
                                  <div className="column-empty">
                                    {stage.id === "todo"
                                      ? "Your next idea goes here."
                                      : "Nothing here yet."}
                                  </div>
                                )}
                                {tickets.map((ticket) => {
                                  const agent = project.agents.find(
                                    (member) =>
                                      member.id === ticket.assignedAgentId,
                                  );
                                  return (
                                    <article
                                      className={`work-ticket${ticket.execution === "waiting_user" ? " work-ticket--waiting" : ticket.execution === "failed" ? " work-ticket--failed" : ""}`}
                                      key={ticket.id}
                                      data-ticket-id={ticket.id}
                                      data-execution={ticket.execution}
                                    >
                                      <div className="work-ticket__tag-row">
                                        {ticket.execution !== "ready" && (
                                          <span
                                            className={`execution-label execution-label--${ticket.execution}`}
                                          >
                                            {executionLabels[ticket.execution]}
                                          </span>
                                        )}
                                        {ticket.epic && (
                                          <span className="work-ticket__epic">
                                            {ticket.epic}
                                          </span>
                                        )}
                                        {ticket.labels.map((label) => (
                                          <span
                                            className="work-ticket__label"
                                            key={label}
                                          >
                                            {label}
                                          </span>
                                        ))}
                                      </div>
                                      <button
                                        type="button"
                                        className="work-ticket__title"
                                        onClick={() =>
                                          setSelectedTicketId(ticket.id)
                                        }
                                        aria-label={`View details: ${ticket.title}`}
                                      >
                                        {ticket.title}
                                      </button>
                                      {ticket.description && (
                                        <p className="work-ticket__description">
                                          {ticket.description}
                                        </p>
                                      )}
                                      <footer className="work-ticket__footer">
                                        <div className="work-ticket__identity">
                                          <span aria-hidden="true">
                                            {ticketTypeGlyphs[ticket.type]}
                                          </span>
                                          <span className="visually-hidden">
                                            {ticketTypeLabels[ticket.type]}
                                          </span>
                                          <code>{ticket.key}</code>
                                        </div>
                                        <div className="work-ticket__details">
                                          {ticket.points !== null && (
                                            <span>{ticket.points} pts</span>
                                          )}
                                          <span
                                            className={`ticket-priority ticket-priority--${ticket.priority}`}
                                          >
                                            {
                                              ticketPriorityLabels[
                                                ticket.priority
                                              ]
                                            }
                                          </span>
                                          {agent && (
                                            <AgentAvatar
                                              agentId={agent.id}
                                              name={agent.displayName}
                                              avatarSeed={agent.avatarSeed}
                                              status={avatarStatus(ticket)}
                                              size={24}
                                              decorative
                                            />
                                          )}
                                        </div>
                                      </footer>
                                      <div className="work-ticket__actions">
                                        {runControls(ticket)}
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </section>
                      );
                    })}
                  </section>
                </section>
              )}
            </>
          )}
        </main>
      )}
      <Modal
        open={needsOpen}
        className="shell-sheet needs-sheet"
        labelledBy="needs-title"
        onClose={() => setNeedsOpen(false)}
      >
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">Attention queue</p>
            <h2 id="needs-title">Needs you</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setNeedsOpen(false)}
            aria-label="Close needs you"
          >
            ×
          </button>
        </div>
        {waitingTickets.length ? (
          <ul className="needs-list">
            {waitingTickets.map((ticket) => (
              <li key={ticket.id}>
                <button type="button" onClick={() => showTicket(ticket.id)}>
                  <span className="needs-button__dot" aria-hidden="true" />
                  <span>
                    <strong>{ticket.title}</strong>
                    <small>Waiting for your input</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="sheet-empty">
            <span className="sheet-empty__check" aria-hidden="true">
              ✓
            </span>
            <p>No tickets need your input.</p>
          </div>
        )}
      </Modal>
      <Modal
        open={settingsOpen}
        className="shell-sheet settings-sheet"
        labelledBy="settings-title"
        onClose={() => setSettingsOpen(false)}
      >
        <div className="sheet-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2 id="settings-title">Project settings</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        {project && (
          <>
            <label className="settings-field" htmlFor="settings-project-name">
              <span>Project name</span>
              <input id="settings-project-name" value={project.name} readOnly />
            </label>
            <form className="settings-form" onSubmit={saveRepository}>
              <label
                className="settings-field"
                htmlFor="project-repository-path"
              >
                <span>Repository path</span>
                <input
                  id="project-repository-path"
                  value={repositoryDraft ?? project.repositoryPath ?? ""}
                  onChange={(event) => setRepositoryDraft(event.target.value)}
                  placeholder="/Users/you/projects/your-project"
                  required
                  disabled={repositoryLocked}
                  aria-describedby="repository-hint"
                />
              </label>
              <p id="repository-hint" className="settings-hint">
                {hasWorkspaces
                  ? "The repository stays fixed once a ticket has a workspace."
                  : "Connect a local Git repository to give each ticket an isolated workspace."}
              </p>
              <button
                type="submit"
                className="button button--primary"
                disabled={
                  repositoryLocked ||
                  !(repositoryDraft ?? project.repositoryPath ?? "").trim() ||
                  (repositoryDraft ?? project.repositoryPath ?? "").trim() ===
                    project.repositoryPath
                }
              >
                {pending.has("repository")
                  ? "Saving repository..."
                  : "Save repository"}
              </button>
            </form>
            <form className="board-settings" onSubmit={saveBoardSettings}>
              <div className="board-settings__heading">
                <h3>Board settings</h3>
                <p>
                  Set work limits and choose whether waiting tickets appear
                  above the board.
                </p>
              </div>
              <fieldset className="wip-limit-grid">
                <legend>Work in progress limits</legend>
                {(
                  [
                    ["implementation", "Building"],
                    ["review", "Review"],
                    ["qa", "QA"],
                  ] as const
                ).map(([stage, label]) => (
                  <label className="wip-limit-field" key={stage}>
                    <span>{label}</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={1}
                      required
                      value={boardSettingsDraft?.wipLimits[stage] ?? 1}
                      disabled={
                        !boardSettingsDraft || pending.has("board-settings")
                      }
                      onChange={(event) =>
                        updateWipLimit(stage, event.currentTarget.valueAsNumber)
                      }
                    />
                  </label>
                ))}
              </fieldset>
              <label className="needs-lane-setting">
                <input
                  type="checkbox"
                  checked={boardSettingsDraft?.showNeedsLane ?? false}
                  disabled={
                    !boardSettingsDraft || pending.has("board-settings")
                  }
                  onChange={(event) =>
                    setBoardSettingsDraft((current) =>
                      current
                        ? { ...current, showNeedsLane: event.target.checked }
                        : current,
                    )
                  }
                />
                <span>Show a Needs you lane above the board</span>
              </label>
              <button
                type="submit"
                className="button button--primary"
                disabled={
                  !boardSettingsDraft ||
                  pending.has("board-settings") ||
                  JSON.stringify(boardSettingsDraft) ===
                    JSON.stringify(project.boardSettings)
                }
              >
                {pending.has("board-settings")
                  ? "Saving board settings…"
                  : "Save board settings"}
              </button>
            </form>
          </>
        )}
        <div className="settings-tools">
          <div>
            <strong>Avatar lab</strong>
            <span>Preview the procedural agent states.</span>
          </div>
          <button
            type="button"
            className="button button--quiet"
            onClick={() => {
              setSettingsOpen(false);
              setView("avatars");
            }}
          >
            Open lab
          </button>
        </div>
      </Modal>
      <Modal
        open={commandOpen}
        className="command-menu"
        labelledBy="command-title"
        onClose={closeCommandMenu}
      >
        <h2 id="command-title" className="visually-hidden">
          Command menu
        </h2>
        <div className="command-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={commandQuery}
            onChange={(event) => setCommandQuery(event.target.value)}
            placeholder="Jump to a ticket, channel, or agent"
            aria-label="Search commands"
            // biome-ignore lint/a11y/noAutofocus: opening the command menu is an explicit request to search.
            autoFocus
          />
          <kbd>esc</kbd>
        </div>
        <div className="command-results">
          {(matchesCommand("Board") || matchesCommand("Team chat")) && (
            <section aria-labelledby="command-navigation">
              <h3 id="command-navigation">Navigation</h3>
              {matchesCommand("Board") && (
                <button type="button" onClick={showBoard}>
                  <span>Board</span>
                  <small>Workspace</small>
                </button>
              )}
              {matchesCommand("Team chat") && (
                <button type="button" onClick={showChat}>
                  <span>#team</span>
                  <small>Channel</small>
                </button>
              )}
            </section>
          )}
          {project && matchesCommand("Create ticket") && (
            <section aria-labelledby="command-actions">
              <h3 id="command-actions">Commands</h3>
              <button type="button" onClick={showTicketForm}>
                <span>Create ticket</span>
                <small>C</small>
              </button>
            </section>
          )}
          {snapshot?.tickets.some((ticket) =>
            matchesCommand(`${ticket.title} ticket run cancel`),
          ) && (
            <section aria-labelledby="command-tickets">
              <h3 id="command-tickets">Tickets</h3>
              {snapshot.tickets
                .filter((ticket) =>
                  matchesCommand(`${ticket.title} ticket run cancel`),
                )
                .map((ticket) => (
                  <div className="command-ticket" key={ticket.id}>
                    <button type="button" onClick={() => showTicket(ticket.id)}>
                      <span>{ticket.title}</span>
                      <small>{executionLabels[ticket.execution]}</small>
                    </button>
                    {ticket.execution === "running" ? (
                      <button
                        type="button"
                        className="command-ticket__action"
                        disabled={pending.has(ticket.id)}
                        onClick={() => {
                          closeCommandMenu();
                          void command(ticket.id, () =>
                            window.stave.runs.cancel({ ticketId: ticket.id }),
                          );
                        }}
                      >
                        Cancel
                      </button>
                    ) : ticket.stage !== "done" ? (
                      <button
                        type="button"
                        className="command-ticket__action"
                        disabled={
                          pending.has(ticket.id) ||
                          preparingTicketId !== null ||
                          activeCount > 0
                        }
                        onClick={() => {
                          const mode = project?.repositoryPath
                            ? "codex"
                            : "simulation";
                          closeCommandMenu();
                          void command(ticket.id, () =>
                            window.stave.runs.start({
                              ticketId: ticket.id,
                              mode,
                            }),
                          );
                        }}
                      >
                        Run
                      </button>
                    ) : null}
                  </div>
                ))}
            </section>
          )}
          {project?.agents.some((agent) =>
            matchesCommand(`${agent.displayName} agent`),
          ) && (
            <section aria-labelledby="command-agents">
              <h3 id="command-agents">Agents</h3>
              {project.agents
                .filter((agent) => matchesCommand(`${agent.displayName} agent`))
                .map((agent) => (
                  <button
                    type="button"
                    key={agent.id}
                    onClick={() => showAgent(agent.id)}
                  >
                    <span>{agent.displayName}</span>
                    <small>{roleLabels[agent.role]} · Direct message</small>
                  </button>
                ))}
            </section>
          )}
        </div>
      </Modal>
      {view === "board" && selectedTicket && (
        <section
          className="ticket-inspector"
          aria-labelledby="ticket-detail-title"
        >
          <div className="ticket-detail__heading">
            <div className="ticket-inspector__identity">
              <span
                className={`simulation-badge ${selectedTicket.mode === "codex" ? "simulation-badge--codex" : ""}`}
              >
                {selectedTicket.mode === "codex" ? "Codex" : "Simulation"}
              </span>
              <code>{selectedTicket.key}</code>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => setSelectedTicketId(null)}
            >
              Close details
            </button>
          </div>
          <p className="eyebrow">
            {stages.find((stage) => stage.id === selectedTicket.stage)?.label} ·{" "}
            {executionLabels[selectedTicket.execution]}
          </p>
          <h2 id="ticket-detail-title">{selectedTicket.title}</h2>
          <section
            className="ticket-stage-timeline"
            aria-label="Ticket stage timeline"
          >
            {stages.map((stage) => {
              const currentIndex = stages.findIndex(
                (item) => item.id === selectedTicket.stage,
              );
              const stageIndex = stages.findIndex(
                (item) => item.id === stage.id,
              );
              return (
                <span
                  className={
                    stageIndex < currentIndex
                      ? "ticket-stage-timeline__segment ticket-stage-timeline__segment--complete"
                      : stageIndex === currentIndex
                        ? "ticket-stage-timeline__segment ticket-stage-timeline__segment--current"
                        : "ticket-stage-timeline__segment"
                  }
                  key={stage.id}
                  title={stage.label}
                />
              );
            })}
          </section>
          <dl className="ticket-metadata">
            <div>
              <dt>Type</dt>
              <dd>{ticketTypeLabels[selectedTicket.type]}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd
                className={`ticket-priority ticket-priority--${selectedTicket.priority}`}
              >
                {ticketPriorityLabels[selectedTicket.priority]}
              </dd>
            </div>
            <div>
              <dt>Points</dt>
              <dd>{selectedTicket.points ?? "—"}</dd>
            </div>
            <div>
              <dt>Epic</dt>
              <dd>{selectedTicket.epic ?? "—"}</dd>
            </div>
          </dl>
          {selectedTicket.labels.length > 0 && (
            <section
              className="ticket-metadata__labels"
              aria-label="Ticket labels"
            >
              {selectedTicket.labels.map((label) => (
                <span className="work-ticket__label" key={label}>
                  {label}
                </span>
              ))}
            </section>
          )}
          <p className="ticket-detail__description">
            {selectedTicket.description || "No description added."}
          </p>
          {selectedRun?.summary && (
            <div
              className={`run-result run-result--${selectedTicket.execution}`}
              role="status"
            >
              <h3>
                {stages.find((stage) => stage.id === selectedRun.stage)?.label}{" "}
                · {executionLabels[selectedRun.state]}
              </h3>
              <p>{selectedRun.summary}</p>
            </div>
          )}
          {error && (
            <div className="notice notice--error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="text-button"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
          <h3>Git workspace</h3>
          {selectedTicket.workspace && (
            <dl className="ticket-workspace">
              <dt>Workspace</dt>
              <dd className="machine-text">{selectedTicket.workspace.path}</dd>
              <dt>Branch</dt>
              <dd className="machine-text">
                {selectedTicket.workspace.branch}
              </dd>
              <dt>Changes</dt>
              <dd>
                {selectedTicket.workspace.dirty
                  ? "Uncommitted changes"
                  : "Clean"}
              </dd>
            </dl>
          )}
          {project?.repositoryPath ? (
            <div className="workspace-preparation">
              <p>
                {selectedTicket.workspace
                  ? "Refresh to check the branch and any uncommitted changes."
                  : "Prepare a workspace now, or let Run Codex prepare it automatically."}
              </p>
              <button
                type="button"
                className="button button--small button--quiet"
                disabled={
                  pending.has(selectedTicket.id) ||
                  preparingTicketId !== null ||
                  activeCount > 0 ||
                  pending.has("repository")
                }
                onClick={() => void prepareWorkspace(selectedTicket)}
              >
                {preparingTicketId === selectedTicket.id
                  ? selectedTicket.workspace
                    ? "Refreshing workspace…"
                    : "Preparing workspace…"
                  : selectedTicket.workspace
                    ? "Refresh workspace"
                    : "Prepare workspace"}
              </button>
            </div>
          ) : (
            <p className="workspace-preparation__hint">
              Set a repository path in the project to prepare a Git workspace.
            </p>
          )}
          <div className="ticket-detail__controls">
            <div className="ticket-inspector__actions">
              <button
                type="button"
                className="button button--small button--quiet"
                onClick={() => showTicketThread(selectedTicket.id)}
              >
                Open in chat
              </button>
              <button
                type="button"
                className="button button--small button--quiet"
                disabled
                title="Diff viewing will be available with ticket change summaries."
              >
                View diff
              </button>
            </div>
            {runControls(selectedTicket)}
            {project?.repositoryPath && selectedTicket.stage !== "done" && (
              <p className="workspace-preparation__hint">
                {selectedTicket.runId !== null
                  ? selectedTicket.mode === "codex"
                    ? "Continue with Codex in this ticket's workspace. Changes stay local and are not pushed."
                    : "This ticket uses simulation. Create another ticket to make code changes with Codex."
                  : "Run Codex makes local code changes in this ticket's isolated workspace. Changes are not pushed."}
              </p>
            )}
          </div>
          <h3>Run output</h3>
          <pre className="run-output" aria-live="polite">
            {selectedTicket.output ||
              "Run this ticket to see the team's progress here."}
          </pre>
          <h3>Ticket activity</h3>
          <ol className="ticket-activity">
            {snapshot?.activity
              .filter((entry) => entry.ticketId === selectedTicket.id)
              .map((entry) => (
                <li key={entry.id}>{entry.message}</li>
              ))}
          </ol>
        </section>
      )}
    </>
  );
}
