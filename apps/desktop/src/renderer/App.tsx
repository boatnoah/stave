import { AgentAvatar, type AvatarStatus } from "@stave/avatar";
import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";

import type {
  AgentSnapshot,
  DesktopAgentRole,
  TicketSnapshot,
  WorkspaceSnapshot,
} from "../shared/workspace-snapshot";
import { AvatarLab } from "./AvatarLab";

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
  { id: "todo", label: "Todo" },
  { id: "implementation", label: "Implementation" },
  { id: "review", label: "Review" },
  { id: "qa", label: "QA" },
  { id: "done", label: "Done" },
];

const roleLabels: Record<DesktopAgentRole, string> = {
  tech_lead: "Tech lead",
  engineer: "Engineer",
  qa: "Quality assurance",
};

const executionLabels: Record<TicketSnapshot["execution"], string> = {
  ready: "Ready to start",
  running: "Running",
  succeeded: "Completed",
  failed: "Failed",
  canceled: "Canceled",
  interrupted: "Interrupted",
  waiting_capacity: "Queued",
  waiting_user: "Needs your input",
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

function isActive(ticket: TicketSnapshot): boolean {
  return (
    ticket.execution === "running" ||
    ticket.execution === "waiting_capacity" ||
    ticket.execution === "waiting_user"
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function TeamMember({
  agent,
  tickets,
}: {
  readonly agent: AgentSnapshot;
  readonly tickets: readonly TicketSnapshot[];
}) {
  const assigned = tickets.filter(
    (ticket) => ticket.assignedAgentId === agent.id,
  );
  const ticket = assigned.find(isActive) ?? assigned.at(-1);
  const status = agent.enabled ? avatarStatus(ticket) : "idle";

  return (
    <article
      className="crew-member"
      data-agent-id={agent.id}
      data-agent-status={status}
    >
      <AgentAvatar
        agentId={agent.id}
        name={agent.displayName}
        avatarSeed={agent.avatarSeed}
        status={status}
        size={78}
      />
      <div className="crew-member__copy">
        <div className="crew-member__heading">
          <h3>{agent.displayName}</h3>
          <span
            className={`presence presence--${status}`}
            aria-label={status}
          />
        </div>
        <p className="crew-member__role">{roleLabels[agent.role]}</p>
        <p className="crew-member__activity">
          {!agent.enabled
            ? "Unavailable"
            : ticket
              ? `${executionLabels[ticket.execution]} · ${ticket.title}`
              : "Ready for the next ticket"}
        </p>
      </div>
    </article>
  );
}

export function App() {
  const [view, setView] = useState<"project" | "avatars">("project");
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
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const ticketDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ticketDialogRef.current;
    if (!dialog || view !== "project") return;
    dialog.showModal();
    return () => dialog.close();
  }, [selectedTicketId, view]);

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
        }),
      () => {
        setTicketTitle("");
        setTicketDescription("");
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
  const completedCount =
    snapshot?.tickets.filter((ticket) => ticket.stage === "done").length ?? 0;
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
    return (
      <button
        type="button"
        className="button button--small"
        disabled={
          busy || preparingTicketId !== null || pending.has("repository")
        }
        onClick={() =>
          void command(ticket.id, () =>
            window.stave.runs.start({
              ticketId: ticket.id,
              mode: "simulation",
            }),
          )
        }
      >
        {preparingTicketId === ticket.id
          ? "Preparing…"
          : busy
            ? "Starting…"
            : "Run simulation"}
        <span aria-hidden="true">↗</span>
      </button>
    );
  }

  return (
    <>
      <header className="product-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setView("project");
          }}
          aria-label="Stave project"
        >
          <span className="brand__mark" aria-hidden="true">
            s
          </span>
          stave
          <span className="brand__subtitle">A little team. Real progress.</span>
        </a>
        <div className="product-header__actions">
          <span className="local-label">
            <span aria-hidden="true" />
            Local workspace
          </span>
          <button
            type="button"
            className="text-button"
            onClick={() => setView(view === "project" ? "avatars" : "project")}
          >
            {view === "project" ? "Avatar lab" : "Back to project"}
          </button>
        </div>
      </header>
      {view === "avatars" ? (
        <AvatarLab />
      ) : (
        <main className="workspace">
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
            <section className="welcome">
              <div className="welcome__intro">
                <p className="eyebrow">Your next project starts here</p>
                <h1>
                  Good work takes
                  <br />a small team.
                </h1>
                <p>
                  Give your project a home. Your engineer, tech lead, and QA
                  teammate will help move each ticket from an idea to done.
                </p>
                <div className="welcome__footnote">
                  <span className="simulation-badge">Simulation</span>
                  <span>Try the delivery workflow with a simulated run.</span>
                </div>
              </div>
              <form className="project-form" onSubmit={createProject}>
                <p className="eyebrow">01 / Set up your workspace</p>
                <h2>Make room for the work.</h2>
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
                    ? "Creating project…"
                    : "Create project"}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            </section>
          )}
          {snapshot && project && (
            <>
              <section className="project-heading">
                <div>
                  <p className="eyebrow">Your workspace</p>
                  <h1>{project.name}</h1>
                  <p>
                    {project.repositoryPath ??
                      "A small team, ready to move your next idea forward."}
                  </p>
                </div>
                <div className="project-heading__summary">
                  <span className="simulation-badge">Simulation</span>
                  <div>
                    <strong>
                      {completedCount}
                      <span> / {snapshot.tickets.length}</span>
                    </strong>
                    <span>tickets complete</span>
                  </div>
                </div>
              </section>
              <form className="repository-form" onSubmit={saveRepository}>
                <div className="repository-form__field">
                  <label htmlFor="project-repository-path">
                    Repository path
                  </label>
                  <input
                    id="project-repository-path"
                    value={repositoryDraft ?? project.repositoryPath ?? ""}
                    onChange={(event) => setRepositoryDraft(event.target.value)}
                    placeholder="/Users/you/projects/your-project"
                    required
                    disabled={repositoryLocked}
                    aria-describedby="repository-hint"
                  />
                </div>
                <button
                  type="submit"
                  className="button button--quiet"
                  disabled={
                    repositoryLocked ||
                    !(repositoryDraft ?? project.repositoryPath ?? "").trim() ||
                    (repositoryDraft ?? project.repositoryPath ?? "").trim() ===
                      project.repositoryPath
                  }
                >
                  {pending.has("repository")
                    ? "Saving repository…"
                    : "Save repository"}
                </button>
                <p id="repository-hint" className="repository-form__hint">
                  {hasWorkspaces
                    ? "The repository stays fixed once a ticket has a workspace."
                    : "Connect a local Git repository to prepare a separate workspace for each ticket."}
                </p>
              </form>
              <section className="crew" aria-label="Project team">
                <div className="section-kicker">
                  <h2>The team</h2>
                  <span>
                    {activeCount
                      ? `${activeCount} ${activeCount === 1 ? "ticket" : "tickets"} in progress`
                      : "Ready when you are"}
                  </span>
                </div>
                <div className="crew-grid">
                  {project.agents.map((agent) => (
                    <TeamMember
                      key={agent.id}
                      agent={agent}
                      tickets={snapshot.tickets}
                    />
                  ))}
                </div>
              </section>
              <section className="delivery" aria-labelledby="delivery-title">
                <div className="delivery-heading">
                  <div>
                    <p className="eyebrow">One step at a time</p>
                    <h2 id="delivery-title">The work ahead</h2>
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
                </div>
                <p className="simulation-note">
                  Simulation runs move tickets through implementation, review,
                  and QA. They do not make code changes.
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
                        onChange={(event) => setTicketTitle(event.target.value)}
                        placeholder="What should the team work on?"
                        required
                        maxLength={200}
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
                    <button
                      type="submit"
                      className="button button--primary"
                      disabled={pending.has("ticket") || !ticketTitle.trim()}
                    >
                      {pending.has("ticket")
                        ? "Creating ticket…"
                        : "Create ticket"}
                    </button>
                  </form>
                )}
                <div className="delivery-board" aria-label="Ticket board">
                  {stages.map((stage) => {
                    const tickets = snapshot.tickets.filter(
                      (ticket) => ticket.stage === stage.id,
                    );
                    return (
                      <section
                        className={`board-column board-column--${stage.id}`}
                        key={stage.id}
                        aria-label={stage.label}
                      >
                        <div className="board-column__heading">
                          <h3>
                            <span aria-hidden="true" />
                            {stage.label}
                          </h3>
                          <span>{tickets.length}</span>
                        </div>
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
                              (member) => member.id === ticket.assignedAgentId,
                            );
                            return (
                              <article
                                className="work-ticket"
                                key={ticket.id}
                                data-ticket-id={ticket.id}
                                data-execution={ticket.execution}
                              >
                                <div className="work-ticket__meta">
                                  <span
                                    className={`execution-label execution-label--${ticket.execution}`}
                                  >
                                    {executionLabels[ticket.execution]}
                                  </span>
                                  <span className="work-ticket__mode">SIM</span>
                                </div>
                                <button
                                  type="button"
                                  className="work-ticket__title"
                                  onClick={() => setSelectedTicketId(ticket.id)}
                                  aria-label={`View details: ${ticket.title}`}
                                >
                                  {ticket.title}
                                </button>
                                {ticket.description && (
                                  <p className="work-ticket__description">
                                    {ticket.description}
                                  </p>
                                )}
                                <div className="work-ticket__assignee">
                                  {agent ? (
                                    <>
                                      <AgentAvatar
                                        agentId={agent.id}
                                        name={agent.displayName}
                                        avatarSeed={agent.avatarSeed}
                                        status={avatarStatus(ticket)}
                                        size={26}
                                        decorative
                                      />
                                      <span>{agent.displayName}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span
                                        className="unassigned-mark"
                                        aria-hidden="true"
                                      >
                                        ○
                                      </span>
                                      <span>Unassigned</span>
                                    </>
                                  )}
                                </div>
                                <div className="work-ticket__actions">
                                  {runControls(ticket)}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
              <section className="activity" aria-labelledby="activity-title">
                <div className="section-kicker">
                  <h2 id="activity-title">Recent activity</h2>
                  <span>Recorded in this workspace</span>
                </div>
                {snapshot.activity.length ? (
                  <ol className="activity-list">
                    {snapshot.activity
                      .slice()
                      .reverse()
                      .slice(0, 12)
                      .map((entry) => (
                        <li key={entry.id}>
                          <span
                            className="activity-list__dot"
                            aria-hidden="true"
                          />
                          <p>{entry.message}</p>
                          <time dateTime={entry.createdAt}>
                            {new Date(entry.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </time>
                        </li>
                      ))}
                  </ol>
                ) : (
                  <p className="activity-empty">
                    The story starts with your first ticket.
                  </p>
                )}
              </section>
            </>
          )}
          <footer className="workspace-footer">
            <span>Stave · Thoughtful work, together.</span>
            <span>Saved locally</span>
          </footer>
        </main>
      )}
      {view === "project" && selectedTicket && (
        <dialog
          ref={ticketDialogRef}
          className="ticket-detail"
          aria-labelledby="ticket-detail-title"
          onCancel={() => setSelectedTicketId(null)}
        >
          <div className="ticket-detail__heading">
            <span className="simulation-badge">Simulation</span>
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
          <p className="ticket-detail__description">
            {selectedTicket.description || "No description added."}
          </p>
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
              <dd>{selectedTicket.workspace.path}</dd>
              <dt>Branch</dt>
              <dd>{selectedTicket.workspace.branch}</dd>
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
                  : "Prepare an isolated Git workspace for this ticket. Simulation runs leave its files unchanged."}
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
            {runControls(selectedTicket)}
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
        </dialog>
      )}
    </>
  );
}
