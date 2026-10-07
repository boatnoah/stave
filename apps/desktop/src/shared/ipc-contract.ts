import {
  desktopAgentRoles,
  type WorkspaceEvent,
  type WorkspaceSnapshot,
  type TicketStage,
  type ExecutionState,
  type RunMode,
  type RunSnapshot,
} from "./workspace-snapshot";
import type {
  CreateProjectRequest,
  CreateTicketRequest,
  StartRunRequest,
  TicketRequest,
} from "./desktop-api";

export const ipcChannels = {
  getWorkspaceSnapshot: "stave:workspace:get-snapshot",
  createProject: "stave:projects:create",
  setRepository: "stave:projects:set-repository",
  prepareWorkspace: "stave:workspaces:prepare",
  createTicket: "stave:tickets:create",
  startRun: "stave:runs:start",
  cancelRun: "stave:runs:cancel",
  workspaceEvent: "stave:events:workspace",
} as const;

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

export function parseCreateProjectRequest(
  value: unknown,
): CreateProjectRequest {
  const record = requireRecord(value, "Create project request");
  const repositoryPath = record.repositoryPath;
  if (repositoryPath !== undefined && typeof repositoryPath !== "string") {
    throw new Error("Repository path must be a string");
  }

  return {
    name: requireString(record.name, "Project name"),
    ...(repositoryPath?.trim()
      ? { repositoryPath: repositoryPath.trim() }
      : {}),
  };
}

export function parseWorkspaceSnapshot(value: unknown): WorkspaceSnapshot {
  const snapshot = requireRecord(value, "Workspace snapshot");
  if (
    !Number.isSafeInteger(snapshot.revision) ||
    Number(snapshot.revision) < 0
  ) {
    throw new Error("Workspace revision must be a non-negative integer");
  }
  if (snapshot.project === null) {
    return {
      revision: Number(snapshot.revision),
      project: null,
      ...parseWork(snapshot),
    };
  }

  const project = requireRecord(snapshot.project, "Project snapshot");
  if (
    !Number.isSafeInteger(project.teamTemplateVersion) ||
    Number(project.teamTemplateVersion) < 1
  ) {
    throw new Error("Team template version must be a positive integer");
  }
  if (!Array.isArray(project.agents)) {
    throw new Error("Project agents must be an array");
  }
  const agents = project.agents.map((candidate) => {
    const agent = requireRecord(candidate, "Agent snapshot");
    const role = requireString(agent.role, "Agent role");
    if (
      !desktopAgentRoles.includes(role as (typeof desktopAgentRoles)[number])
    ) {
      throw new Error(`Unsupported agent role: ${role}`);
    }
    if (typeof agent.enabled !== "boolean") {
      throw new Error("Agent enabled must be a boolean");
    }
    return {
      id: requireString(agent.id, "Agent id"),
      displayName: requireString(agent.displayName, "Agent display name"),
      role: role as (typeof desktopAgentRoles)[number],
      avatarSeed: requireString(agent.avatarSeed, "Agent avatar seed"),
      enabled: agent.enabled,
    };
  });

  return {
    revision: Number(snapshot.revision),
    ...parseWork(snapshot),
    project: {
      id: requireString(project.id, "Project id"),
      name: requireString(project.name, "Project name"),
      repositoryPath:
        project.repositoryPath === null
          ? null
          : requireString(project.repositoryPath, "Repository path"),
      teamTemplateId: requireString(project.teamTemplateId, "Team template id"),
      teamTemplateVersion: Number(project.teamTemplateVersion),
      agents,
    },
  };
}

export function parseWorkspaceEvent(value: unknown): WorkspaceEvent {
  const event = requireRecord(value, "Workspace event");
  if (event.type !== "workspace.changed") {
    throw new Error("Unsupported workspace event");
  }
  return {
    type: "workspace.changed",
    snapshot: parseWorkspaceSnapshot(event.snapshot),
  };
}

export function parseCreateTicketRequest(value: unknown): CreateTicketRequest {
  const record = requireRecord(value, "Create ticket request");
  const title = requireString(record.title, "Ticket title");
  if (title.length > 500) throw new Error("Ticket title is too long");
  if (
    typeof record.description !== "string" ||
    record.description.length > 50_000
  )
    throw new Error("Invalid description");
  return { title, description: record.description.trim() };
}
export function parseTicketRequest(value: unknown): TicketRequest {
  return {
    ticketId: requireString(
      requireRecord(value, "Ticket request").ticketId,
      "Ticket id",
    ),
  };
}
export function parseStartRunRequest(value: unknown): StartRunRequest {
  const record = requireRecord(value, "Run request");
  return { ...parseTicketRequest(record), mode: parseMode(record.mode) };
}
function requireText(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  return value;
}
function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : requireString(value, label);
}
function parseStage(value: unknown): TicketStage {
  switch (value) {
    case "todo":
    case "implementation":
    case "review":
    case "qa":
    case "done":
      return value;
    default:
      throw new Error("Invalid ticket stage");
  }
}
function parseMode(value: unknown): RunMode {
  if (value === "simulation" || value === "codex") return value;
  throw new Error("Unsupported run mode");
}
function parseExecution(value: unknown): ExecutionState {
  switch (value) {
    case "ready":
    case "running":
    case "succeeded":
    case "failed":
    case "canceled":
    case "interrupted":
    case "waiting_capacity":
    case "waiting_user":
      return value;
    default:
      throw new Error("Invalid execution state");
  }
}
function records(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((item) => requireRecord(item, label));
}
function parseWork(
  snapshot: Record<string, unknown>,
): Pick<WorkspaceSnapshot, "tickets" | "activity" | "runs"> {
  return {
    tickets: records(snapshot.tickets, "Tickets").map((ticket) => {
      const workspace =
        ticket.workspace === null
          ? null
          : requireRecord(ticket.workspace, "Git workspace");
      if (workspace && typeof workspace.dirty !== "boolean")
        throw new Error("Invalid workspace dirty status");
      return {
        id: requireString(ticket.id, "Ticket id"),
        title: requireString(ticket.title, "Title"),
        description: requireText(ticket.description, "Description"),
        stage: parseStage(ticket.stage),
        execution: parseExecution(ticket.execution),
        // Tickets saved before Codex support were always simulations.
        mode: ticket.mode === undefined ? "simulation" : parseMode(ticket.mode),
        assignedAgentId: nullableString(ticket.assignedAgentId, "Agent id"),
        runId: nullableString(ticket.runId, "Run id"),
        output: requireText(ticket.output, "Output"),
        workspace: workspace
          ? {
              path: requireString(workspace.path, "Workspace path"),
              branch: requireString(workspace.branch, "Branch"),
              dirty: workspace.dirty === true,
            }
          : null,
      };
    }),
    activity: records(snapshot.activity, "Activity").map((entry) => ({
      id: requireString(entry.id, "Activity id"),
      ticketId: nullableString(entry.ticketId, "Ticket id"),
      message: requireString(entry.message, "Message"),
      createdAt: requireString(entry.createdAt, "Created at"),
    })),
    runs: records(snapshot.runs, "Runs").map((run): RunSnapshot => {
      const stage = parseStage(run.stage);
      if (stage === "todo" || stage === "done")
        throw new Error("Invalid run stage");
      return {
        id: requireString(run.id, "Run id"),
        ticketId: requireString(run.ticketId, "Ticket id"),
        agentId: requireString(run.agentId, "Agent id"),
        stage,
        state: parseExecution(run.state),
        summary: requireText(run.summary, "Summary"),
      };
    }),
  };
}

export function parseRepositoryRequest(value: unknown): {
  repositoryPath: string;
} {
  const repositoryPath = requireString(
    requireRecord(value, "Repository request").repositoryPath,
    "Repository path",
  );
  if (repositoryPath.length > 4096 || /[\x00-\x1f]/u.test(repositoryPath))
    throw new Error("Invalid repository path");
  return { repositoryPath };
}
