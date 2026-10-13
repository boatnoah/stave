import {
  agentId,
  createProject,
  createTicketDetails,
  projectId,
} from "@stave/domain";
import type {
  BoardSettingsRequest,
  CreateProjectRequest,
  CreateTicketRequest,
  RepositoryRequest,
  SendChatMessageRequest,
  StartRunRequest,
  TicketRequest,
} from "../../shared/desktop-api";
import type {
  AgentSnapshot,
  DecisionQuestion,
  DecisionSnapshot,
  ExecutionState,
  RunMode,
  RunSnapshot,
  TicketSnapshot,
  WorkspaceEvent,
  WorkspaceSnapshot,
} from "../../shared/workspace-snapshot";
import type { StaveStore } from "./persistence";

export type WorkspaceListener = (event: WorkspaceEvent) => void;
export type WorkStage = RunSnapshot["stage"];
interface RunOutcome {
  readonly state: Exclude<ExecutionState, "ready" | "running" | "interrupted">;
  readonly summary: string;
}
export interface StageInput {
  readonly ticket: TicketSnapshot;
  readonly stage: WorkStage;
  readonly agent: AgentSnapshot;
  readonly signal: AbortSignal;
  readonly onOutput: (text: string) => void;
  readonly requestDecision: (question: DecisionQuestion) => Promise<string>;
}
export type StageRunner = (input: StageInput) => Promise<RunOutcome>;

const roles = {
  implementation: "engineer",
  review: "tech_lead",
  qa: "qa",
} as const;
const stages: readonly WorkStage[] = ["implementation", "review", "qa"];

const simulateStage: StageRunner = ({ stage, signal, onOutput }) =>
  new Promise((resolve, reject) => {
    const finish = (state: "succeeded" | "canceled") => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      const summary =
        state === "canceled"
          ? "Simulation canceled"
          : `Simulated ${stage} passed. No repository files were changed.`;
      try {
        if (state === "succeeded") onOutput(`${summary}\n`);
      } catch (error) {
        reject(error);
        return;
      }
      resolve({ state, summary });
    };
    const abort = () => finish("canceled");
    const timer = setTimeout(() => finish("succeeded"), 900);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });

export type WorkspaceProvider = (input: {
  repositoryPath: string;
  ticketId: string;
}) => Promise<NonNullable<TicketSnapshot["workspace"]>>;

export class StaveApplication {
  #snapshot: WorkspaceSnapshot = {
    revision: 0,
    project: null,
    tickets: [],
    activity: [],
    runs: [],
    chatMessages: [],
    decisions: [],
  };
  readonly #listeners = new Set<WorkspaceListener>();
  readonly #runner: StageRunner;
  readonly #store: StaveStore | undefined;
  readonly #onFatalError: (error: unknown) => void;
  readonly #workspaceProvider: WorkspaceProvider | undefined;
  readonly #codexRunner: StageRunner | undefined;
  #preparing: Promise<WorkspaceSnapshot> | null = null;
  #active: {
    ticketId: string;
    controller: AbortController;
    done: Promise<void>;
  } | null = null;
  #pendingDecision: {
    readonly decision: DecisionSnapshot;
    readonly resolve: (answer: string) => void;
    readonly signal: AbortSignal;
    readonly abort: () => void;
  } | null = null;

  constructor(
    runner: StageRunner = simulateStage,
    store?: StaveStore,
    onFatalError: (error: unknown) => void = (error) =>
      console.error("Stave storage failure", error),
    workspaceProvider?: WorkspaceProvider,
    codexRunner?: StageRunner,
  ) {
    this.#codexRunner = codexRunner;
    this.#workspaceProvider = workspaceProvider;
    this.#onFatalError = onFatalError;
    this.#runner = runner;
    this.#store = store;
    if (store) {
      const saved = store.load();
      if (saved) this.#snapshot = saved;
      else
        store.save({
          snapshot: this.#snapshot,
          event: { revision: 0, message: "Workspace initialized" },
          expectedRevision: null,
        });
      if (
        this.#snapshot.tickets.some(
          (ticket) =>
            ticket.execution === "running" ||
            ticket.execution === "waiting_user",
        ) ||
        this.#snapshot.runs.some(
          (run) => run.state === "running" || run.state === "waiting_user",
        )
      ) {
        this.#change(
          {
            ...this.#snapshot,
            tickets: this.#snapshot.tickets.map((ticket) =>
              ticket.execution === "running" ||
              ticket.execution === "waiting_user"
                ? { ...ticket, execution: "interrupted" }
                : ticket,
            ),
            runs: this.#snapshot.runs.map((run) =>
              run.state === "running" || run.state === "waiting_user"
                ? {
                    ...run,
                    state: "interrupted",
                    summary: "Application stopped before this run completed",
                  }
                : run,
            ),
            decisions: this.#snapshot.decisions.map((decision) =>
              decision.status === "pending"
                ? { ...decision, status: "interrupted" }
                : decision,
            ),
          },
          null,
          "Recovered interrupted work. Resume when ready.",
        );
      }
    }
  }

  getSnapshot(): WorkspaceSnapshot {
    return structuredClone(this.#snapshot);
  }

  createProject(request: CreateProjectRequest): WorkspaceSnapshot {
    if (this.#snapshot.project)
      throw new Error("A project already exists in this workspace");
    const id = projectId(crypto.randomUUID());
    const project = createProject({
      id,
      name: request.name,
      repositoryPath: request.repositoryPath,
      createAgentId: (member) => agentId(`${id}:${member.key}`),
    });
    return this.#change(
      {
        ...this.#snapshot,
        project: {
          ...project,
          agents: project.agents.map(
            ({ id, displayName, role, avatarSeed, enabled }) => ({
              id,
              displayName,
              role,
              avatarSeed,
              enabled,
            }),
          ),
        },
      },
      null,
      `Created ${project.name} with Maya, Alex, and Sam`,
    );
  }

  setRepository(request: RepositoryRequest): WorkspaceSnapshot {
    if (!this.#snapshot.project) throw new Error("Create a project first");
    if (
      this.#active ||
      this.#preparing ||
      this.#snapshot.tickets.some((ticket) => ticket.workspace)
    )
      throw new Error(
        "Repository cannot change while workspaces or active work exist",
      );
    return this.#change(
      {
        ...this.#snapshot,
        project: {
          ...this.#snapshot.project,
          repositoryPath: request.repositoryPath,
        },
      },
      null,
      "Repository path updated",
    );
  }

  setBoardSettings({ settings }: BoardSettingsRequest): WorkspaceSnapshot {
    const project = this.#snapshot.project;
    if (!project) throw new Error("Create a project first");
    return this.#change(
      { ...this.#snapshot, project: { ...project, boardSettings: settings } },
      null,
      "Board settings updated",
    );
  }

  async sendChatMessage(
    request: SendChatMessageRequest,
  ): Promise<WorkspaceSnapshot> {
    const project = this.#snapshot.project;
    if (!project) throw new Error("Create a project first");
    if (request.ticketId) this.#ticket(request.ticketId);
    if (
      request.agentId &&
      !project.agents.some((agent) => agent.id === request.agentId)
    )
      throw new Error("Agent not found");
    const command = request.text.trim();
    if (
      command.startsWith("/") &&
      !/^\/(?:run\s+STV-[1-9]\d*|cancel\s+STV-[1-9]\d*|ticket\s+.+|assign\s+STV-[1-9]\d*\s+.+)$/iu.test(
        command,
      )
    )
      throw new Error(
        "Use /run STV-1, /ticket title, /assign STV-1 agent, or /cancel STV-1",
      );
    const referencedKey = /^\/(?:run|cancel|assign)\s+(STV-[1-9]\d*)/iu.exec(
      command,
    )?.[1];
    if (
      referencedKey &&
      !this.#snapshot.tickets.some(
        (ticket) => ticket.key.toUpperCase() === referencedKey.toUpperCase(),
      )
    )
      throw new Error(`Ticket ${referencedKey} not found`);
    const assignment = /^\/assign\s+STV-[1-9]\d*\s+(.+)$/iu.exec(command);
    if (
      assignment &&
      !project.agents.some(
        (agent) =>
          agent.displayName.toLowerCase() ===
          (assignment[1] ?? "").toLowerCase(),
      )
    )
      throw new Error(`Agent ${assignment[1] ?? ""} not found`);
    const message = {
      id: crypto.randomUUID(),
      author: "user" as const,
      text: request.text,
      channel: request.channel,
      ticketId: request.ticketId ?? null,
      agentId: request.agentId ?? null,
      createdAt: new Date().toISOString(),
    };
    const snapshot = this.#change({
      ...this.#snapshot,
      chatMessages: [...this.#snapshot.chatMessages, message].slice(-1000),
    });

    const run = /^\/run\s+(STV-[1-9]\d*)$/iu.exec(command);
    if (run) {
      const ticket = this.#snapshot.tickets.find(
        (candidate) =>
          candidate.key.toUpperCase() === (run[1] ?? "").toUpperCase(),
      );
      if (!ticket) throw new Error(`Ticket ${run[1] ?? ""} not found`);
      return this.startRun({ ticketId: ticket.id, mode: ticket.mode });
    }
    const cancel = /^\/cancel\s+(STV-[1-9]\d*)$/iu.exec(command);
    if (cancel) {
      const ticket = this.#snapshot.tickets.find(
        (candidate) =>
          candidate.key.toUpperCase() === (cancel[1] ?? "").toUpperCase(),
      );
      if (!ticket) throw new Error(`Ticket ${cancel[1] ?? ""} not found`);
      return this.cancelRun({ ticketId: ticket.id });
    }
    const create = /^\/ticket\s+(.+)$/iu.exec(command);
    if (create) {
      return this.createTicket({
        title: create[1] ?? "",
        description: "",
        type: "task",
        priority: "medium",
      });
    }
    const assign = /^\/assign\s+(STV-[1-9]\d*)\s+(.+)$/iu.exec(command);
    if (assign) {
      const ticket = this.#snapshot.tickets.find(
        (candidate) =>
          candidate.key.toUpperCase() === (assign[1] ?? "").toUpperCase(),
      );
      const agent = project.agents.find(
        (candidate) =>
          candidate.displayName.toLowerCase() ===
          (assign[2] ?? "").toLowerCase(),
      );
      if (!ticket) throw new Error(`Ticket ${assign[1] ?? ""} not found`);
      if (!agent) throw new Error(`Agent ${assign[2] ?? ""} not found`);
      return this.#change(
        {
          ...this.#snapshot,
          tickets: this.#snapshot.tickets.map((candidate) =>
            candidate.id === ticket.id
              ? { ...candidate, assignedAgentId: agent.id }
              : candidate,
          ),
        },
        ticket.id,
        `Assigned ${ticket.key} to ${agent.displayName}`,
      );
    }
    return snapshot;
  }

  async prepareWorkspace(request: TicketRequest): Promise<WorkspaceSnapshot> {
    if (this.#active || this.#preparing)
      throw new Error("Wait for active work before preparing a workspace");
    this.#ticket(request.ticketId);
    const repositoryPath = this.#snapshot.project?.repositoryPath;
    if (!repositoryPath) throw new Error("Set a repository path first");
    if (!this.#workspaceProvider)
      throw new Error("Git workspaces are unavailable");
    const operation = this.#workspaceProvider({
      repositoryPath,
      ticketId: request.ticketId,
    }).then((workspace) =>
      this.#change(
        {
          ...this.#snapshot,
          tickets: this.#snapshot.tickets.map((ticket) =>
            ticket.id === request.ticketId ? { ...ticket, workspace } : ticket,
          ),
        },
        request.ticketId,
        `Workspace ready on ${workspace.branch}${workspace.dirty ? "; unfinished changes preserved" : ""}`,
      ),
    );
    this.#preparing = operation;
    try {
      return await operation;
    } finally {
      this.#preparing = null;
    }
  }

  createTicket(request: CreateTicketRequest): WorkspaceSnapshot {
    if (!this.#snapshot.project) throw new Error("Create a project first");
    const title = request.title.trim();
    if (!title) throw new Error("Ticket title cannot be empty");
    const ticket: TicketSnapshot = {
      id: crypto.randomUUID(),
      ...createTicketDetails(this.#snapshot.tickets.length + 1, request),
      title,
      description: request.description.trim(),
      stage: "todo",
      execution: "ready",
      mode: "simulation",
      assignedAgentId: null,
      runId: null,
      output: "",
      workspace: null,
    };
    return this.#change(
      { ...this.#snapshot, tickets: [...this.#snapshot.tickets, ticket] },
      ticket.id,
      `Created ticket: ${title}`,
    );
  }

  startRun(request: StartRunRequest): WorkspaceSnapshot {
    if (this.#active || this.#preparing)
      throw new Error(
        "A run is already active. Wait for it or cancel it first.",
      );
    const ticket = this.#ticket(request.ticketId);
    if (ticket.stage === "done") throw new Error("This ticket is already done");
    const project = this.#snapshot.project;
    if (!project) throw new Error("Create a project first");
    for (const role of Object.values(roles)) {
      if (!project.agents.some((agent) => agent.enabled && agent.role === role))
        throw new Error(`No enabled ${role} agent`);
    }
    if (ticket.runId !== null && ticket.mode !== request.mode)
      throw new Error(
        `This ticket already uses ${ticket.mode === "codex" ? "Codex" : "simulation"}`,
      );
    if (request.mode === "codex") {
      if (!project.repositoryPath)
        throw new Error("Set a repository path before running Codex");
      if (!this.#codexRunner || !this.#workspaceProvider)
        throw new Error("Codex runs are unavailable");
    }
    const controller = new AbortController();
    const active = { ticketId: ticket.id, controller, done: Promise.resolve() };
    this.#active = active;
    active.done = this.#execute(ticket.id, request.mode, controller)
      .catch((error) => this.#onFatalError(error))
      .finally(() => {
        if (this.#active === active) this.#active = null;
      });
    return this.getSnapshot();
  }

  async cancelRun(request: TicketRequest): Promise<WorkspaceSnapshot> {
    const active = this.#active;
    if (!active || active.ticketId !== request.ticketId)
      throw new Error("This ticket has no active run");
    active.controller.abort();
    await active.done;
    return this.getSnapshot();
  }

  answerDecision(request: {
    decisionId: string;
    option: string;
  }): WorkspaceSnapshot {
    const pending = this.#pendingDecision;
    if (!pending || pending.decision.id !== request.decisionId)
      throw new Error("This decision is no longer active");
    const answer = pending.decision.options.find(
      (option) => option.label === request.option,
    );
    if (!answer) throw new Error("Select one of the available options");
    const chatMessage = {
      id: crypto.randomUUID(),
      author: "user" as const,
      text: `You answered: ${answer.label}`,
      channel: "ticket" as const,
      ticketId: pending.decision.ticketId,
      agentId: null,
      createdAt: new Date().toISOString(),
    };
    const snapshot = this.#change({
      ...this.#snapshot,
      tickets: this.#snapshot.tickets.map((ticket) =>
        ticket.id === pending.decision.ticketId
          ? { ...ticket, execution: "running" }
          : ticket,
      ),
      runs: this.#snapshot.runs.map((run) =>
        run.id === pending.decision.runId ? { ...run, state: "running" } : run,
      ),
      decisions: this.#snapshot.decisions.map((decision) =>
        decision.id === pending.decision.id
          ? { ...decision, status: "answered", answer: answer.label }
          : decision,
      ),
      chatMessages: [...this.#snapshot.chatMessages, chatMessage].slice(-1000),
    });
    this.#pendingDecision = null;
    pending.signal.removeEventListener("abort", pending.abort);
    pending.resolve(answer.label);
    return snapshot;
  }

  async shutdown(): Promise<void> {
    if (this.#preparing) await this.#preparing.catch(() => {});
    const active = this.#active;
    if (active) {
      active.controller.abort();
      await active.done;
    }
  }

  subscribe(listener: WorkspaceListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async #execute(
    ticketId: string,
    mode: RunMode,
    controller: AbortController,
  ): Promise<void> {
    const runner = mode === "codex" ? this.#codexRunner : this.#runner;
    let runId: string | null = null;
    try {
      if (!runner) throw new Error("Codex runs are unavailable");
      if (mode === "codex" && !this.#ticket(ticketId).workspace) {
        const workspace = await this.#refreshWorkspace(ticketId);
        if (!workspace) throw new Error("Git workspaces are unavailable");
        this.#change(
          {
            ...this.#snapshot,
            tickets: this.#snapshot.tickets.map((ticket) =>
              ticket.id === ticketId ? { ...ticket, workspace } : ticket,
            ),
          },
          ticketId,
          `Workspace ready on ${workspace.branch}${workspace.dirty ? "; unfinished changes preserved" : ""}`,
        );
      }
      const initialStage = this.#ticket(ticketId).stage;
      const first =
        initialStage === "todo"
          ? 0
          : // biome-ignore lint/complexity/useIndexOf: indexOf rejects the wider TicketStage type.
            stages.findIndex((stage) => stage === initialStage);
      for (const stage of stages.slice(first)) {
        if (controller.signal.aborted) break;
        const agent = this.#snapshot.project?.agents.find(
          (candidate) => candidate.role === roles[stage] && candidate.enabled,
        );
        if (!agent) throw new Error(`No enabled ${roles[stage]} agent`);
        const run: RunSnapshot = {
          id: crypto.randomUUID(),
          ticketId,
          agentId: agent.id,
          stage,
          state: "running",
          summary: "",
        };
        runId = run.id;
        this.#change(
          {
            ...this.#snapshot,
            tickets: this.#snapshot.tickets.map((ticket) =>
              ticket.id === ticketId
                ? {
                    ...ticket,
                    stage,
                    execution: "running",
                    mode,
                    runId: run.id,
                    assignedAgentId: agent.id,
                  }
                : ticket,
            ),
            runs: [...this.#snapshot.runs, run],
          },
          ticketId,
          mode === "codex"
            ? `${agent.displayName} started ${stage} with Codex`
            : `${agent.displayName} started simulated ${stage}`,
        );
        const outcome = await runner({
          ticket: this.#ticket(ticketId),
          stage,
          agent,
          signal: controller.signal,
          onOutput: (text) => {
            if (!controller.signal.aborted)
              this.#updateTicket(ticketId, {
                output: (this.#ticket(ticketId).output + text).slice(-100_000),
              });
          },
          requestDecision: (question) =>
            this.#requestDecision(
              ticketId,
              run.id,
              question,
              controller.signal,
            ),
        });
        this.#interruptPendingDecision(run.id);
        const state = controller.signal.aborted ? "canceled" : outcome.state;
        const workspace =
          mode === "codex"
            ? await this.#refreshWorkspace(ticketId).catch(() => null)
            : null;
        this.#change(
          {
            ...this.#snapshot,
            tickets: this.#snapshot.tickets.map((ticket) =>
              ticket.id === ticketId
                ? {
                    ...ticket,
                    execution: state,
                    workspace: workspace ?? ticket.workspace,
                    stage:
                      state === "succeeded" && stage === "qa" ? "done" : stage,
                  }
                : ticket,
            ),
            runs: this.#snapshot.runs.map((candidate) =>
              candidate.id === run.id
                ? { ...candidate, state, summary: outcome.summary }
                : candidate,
            ),
          },
          ticketId,
          outcome.summary,
        );
        if (state !== "succeeded") return;
      }
    } catch (error) {
      if (runId) this.#interruptPendingDecision(runId);
      const message = error instanceof Error ? error.message : "Run failed";
      this.#change(
        {
          ...this.#snapshot,
          tickets: this.#snapshot.tickets.map((candidate) =>
            candidate.id === ticketId
              ? { ...candidate, execution: "failed" }
              : candidate,
          ),
          runs: this.#snapshot.runs.map((run) =>
            run.id === runId
              ? { ...run, state: "failed", summary: message }
              : run,
          ),
        },
        ticketId,
        message,
      );
    }
  }

  async #refreshWorkspace(
    ticketId: string,
  ): Promise<TicketSnapshot["workspace"]> {
    const repositoryPath = this.#snapshot.project?.repositoryPath;
    if (!repositoryPath || !this.#workspaceProvider) return null;
    return this.#workspaceProvider({ repositoryPath, ticketId });
  }

  #requestDecision(
    ticketId: string,
    runId: string,
    question: DecisionQuestion,
    signal: AbortSignal,
  ): Promise<string> {
    if (signal.aborted) return Promise.resolve("");
    if (this.#pendingDecision)
      throw new Error("Another user decision is already waiting");
    if (question.options.length < 2 || question.options.length > 8)
      throw new Error("A decision needs between 2 and 8 options");
    const decision: DecisionSnapshot = {
      id: crypto.randomUUID(),
      ticketId,
      runId,
      questionId: question.id,
      header: question.header,
      question: question.question,
      options: question.options,
      status: "pending",
      answer: null,
      createdAt: new Date().toISOString(),
    };
    return new Promise((resolve) => {
      const abort = () => {
        if (this.#pendingDecision?.decision.id !== decision.id) return;
        this.#pendingDecision = null;
        this.#change({
          ...this.#snapshot,
          decisions: this.#snapshot.decisions.map((candidate) =>
            candidate.id === decision.id
              ? { ...candidate, status: "interrupted" }
              : candidate,
          ),
        });
        resolve("");
      };
      this.#pendingDecision = { decision, resolve, signal, abort };
      signal.addEventListener("abort", abort, { once: true });
      this.#change(
        {
          ...this.#snapshot,
          tickets: this.#snapshot.tickets.map((ticket) =>
            ticket.id === ticketId
              ? { ...ticket, execution: "waiting_user" }
              : ticket,
          ),
          runs: this.#snapshot.runs.map((run) =>
            run.id === runId ? { ...run, state: "waiting_user" } : run,
          ),
          decisions: [...this.#snapshot.decisions, decision],
        },
        ticketId,
        `${question.header}: ${question.question}`,
      );
    });
  }

  #interruptPendingDecision(runId: string): void {
    const pending = this.#pendingDecision;
    if (!pending || pending.decision.runId !== runId) return;
    this.#pendingDecision = null;
    pending.signal.removeEventListener("abort", pending.abort);
    this.#change({
      ...this.#snapshot,
      decisions: this.#snapshot.decisions.map((decision) =>
        decision.id === pending.decision.id
          ? { ...decision, status: "interrupted" }
          : decision,
      ),
    });
    pending.resolve("");
  }

  #ticket(id: string): TicketSnapshot {
    const ticket = this.#snapshot.tickets.find(
      (candidate) => candidate.id === id,
    );
    if (!ticket) throw new Error("Ticket not found");
    return ticket;
  }

  #updateTicket(id: string, patch: Partial<TicketSnapshot>): void {
    this.#change({
      ...this.#snapshot,
      tickets: this.#snapshot.tickets.map((ticket) =>
        ticket.id === id ? { ...ticket, ...patch } : ticket,
      ),
    });
  }

  #change(
    snapshot: WorkspaceSnapshot,
    ticketId?: string | null,
    message?: string,
  ): WorkspaceSnapshot {
    const next = {
      ...snapshot,
      revision: this.#snapshot.revision + 1,
      activity: message
        ? [
            ...snapshot.activity,
            {
              id: crypto.randomUUID(),
              ticketId: ticketId ?? null,
              message,
              createdAt: new Date().toISOString(),
            },
          ].slice(-500)
        : snapshot.activity,
    };
    this.#store?.save({
      snapshot: next,
      event: {
        revision: next.revision,
        message: message ?? "Run output updated",
      },
      expectedRevision: this.#snapshot.revision,
    });
    this.#snapshot = next;
    const result = this.getSnapshot();
    for (const listener of this.#listeners) {
      try {
        listener({ type: "workspace.changed", snapshot: result });
      } catch {
        /* A closed renderer cannot stop a run. */
      }
    }
    return result;
  }
}
