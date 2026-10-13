import {
  createTicketKey,
  defaultProjectBoardSettings,
  defaultTicketPriority,
  defaultTicketType,
  type ProjectBoardSettings,
  type TicketDetails,
  type TicketPriority,
  type TicketType,
  ticketPriorities,
  ticketTypes,
} from "@stave/domain";
import type {
  BoardSettingsRequest,
  CreateProjectRequest,
  CreateTicketRequest,
  SendChatMessageRequest,
  StartRunRequest,
  TicketRequest,
} from "./desktop-api";
import {
  desktopAgentRoles,
  type ExecutionState,
  type RunMode,
  type RunSnapshot,
  type TicketStage,
  type WorkspaceEvent,
  type WorkspaceSnapshot,
} from "./workspace-snapshot";

export const ipcChannels = {
  getWorkspaceSnapshot: "stave:workspace:get-snapshot",
  createProject: "stave:projects:create",
  setRepository: "stave:projects:set-repository",
  setBoardSettings: "stave:projects:set-board-settings",
  prepareWorkspace: "stave:workspaces:prepare",
  createTicket: "stave:tickets:create",
  startRun: "stave:runs:start",
  cancelRun: "stave:runs:cancel",
  workspaceEvent: "stave:events:workspace",
  sendChatMessage: "stave:chat:send-message",
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
      boardSettings:
        project.boardSettings === undefined
          ? defaultProjectBoardSettings
          : parseProjectBoardSettings(project.boardSettings),
    },
  };
}

function parseProjectBoardSettings(value: unknown): ProjectBoardSettings {
  const settings = requireRecord(value, "Board settings");
  const limits = requireRecord(settings.wipLimits, "WIP limits");
  const readLimit = (value: unknown, label: string) => {
    if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 20)
      throw new Error(`${label} must be an integer from 1 to 20`);
    return Number(value);
  };
  if (typeof settings.showNeedsLane !== "boolean")
    throw new Error("Needs-you lane setting must be a boolean");
  return {
    wipLimits: {
      implementation: readLimit(
        limits.implementation,
        "Implementation WIP limit",
      ),
      review: readLimit(limits.review, "Review WIP limit"),
      qa: readLimit(limits.qa, "QA WIP limit"),
    },
    showNeedsLane: settings.showNeedsLane,
  };
}

export function parseBoardSettingsRequest(
  value: unknown,
): BoardSettingsRequest {
  return {
    settings: parseProjectBoardSettings(
      requireRecord(value, "Board settings request").settings,
    ),
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
  return {
    title,
    description: record.description.trim(),
    ...parseTicketMetadata(record),
  };
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
): Pick<WorkspaceSnapshot, "tickets" | "activity" | "runs" | "chatMessages"> {
  return {
    tickets: records(snapshot.tickets, "Tickets").map((ticket, index) => {
      const workspace =
        ticket.workspace === null
          ? null
          : requireRecord(ticket.workspace, "Git workspace");
      if (workspace && typeof workspace.dirty !== "boolean")
        throw new Error("Invalid workspace dirty status");
      return {
        ...parseTicketDetails(ticket, index + 1),
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
    chatMessages: (snapshot.chatMessages === undefined
      ? []
      : records(snapshot.chatMessages, "Chat messages")
    ).map((message) => {
      const channel = message.channel;
      if (
        channel !== "team" &&
        channel !== "releases" &&
        channel !== "ticket" &&
        channel !== "direct"
      )
        throw new Error("Invalid chat channel");
      if (message.author !== "user") throw new Error("Invalid chat author");
      return {
        id: requireString(message.id, "Chat message id"),
        author: "user" as const,
        text: requireString(message.text, "Chat message"),
        channel,
        ticketId: nullableString(message.ticketId, "Ticket id"),
        agentId: nullableString(message.agentId, "Agent id"),
        createdAt: requireString(message.createdAt, "Created at"),
      };
    }),
  };
}

export function parseSendChatMessageRequest(
  value: unknown,
): SendChatMessageRequest {
  const record = requireRecord(value, "Chat message request");
  const channel = record.channel;
  if (
    channel !== "team" &&
    channel !== "releases" &&
    channel !== "ticket" &&
    channel !== "direct"
  )
    throw new Error("Invalid chat channel");
  const text = requireString(record.text, "Chat message");
  if (text.length > 4000) throw new Error("Chat message is too long");
  const ticketId =
    record.ticketId === undefined
      ? undefined
      : requireString(record.ticketId, "Ticket id");
  const agentId =
    record.agentId === undefined
      ? undefined
      : requireString(record.agentId, "Agent id");
  if (channel === "ticket" && !ticketId)
    throw new Error("Ticket thread messages need a ticket");
  if (channel === "direct" && !agentId)
    throw new Error("Direct messages need an agent");
  if (channel !== "ticket" && ticketId)
    throw new Error("Ticket id is only valid in a ticket thread");
  if (channel !== "direct" && agentId)
    throw new Error("Agent id is only valid in a direct message");
  return {
    text,
    channel,
    ...(ticketId ? { ticketId } : {}),
    ...(agentId ? { agentId } : {}),
  };
}

function parseTicketDetails(ticket: Record<string, unknown>, sequence: number) {
  return {
    key:
      ticket.key === undefined
        ? createTicketKey(sequence)
        : parseTicketKey(ticket.key),
    ...parseTicketMetadata(ticket),
  };
}

function parseTicketKey(value: unknown): string {
  const key = requireString(value, "Ticket key");
  const match = /^STV-([1-9]\d*)$/u.exec(key);
  if (!match || !Number.isSafeInteger(Number(match[1])))
    throw new Error("Invalid ticket key");
  return key;
}

function parseTicketMetadata(
  ticket: Record<string, unknown>,
): Omit<TicketDetails, "key"> {
  const type =
    ticket.type === undefined
      ? defaultTicketType
      : parseTicketType(ticket.type);
  const priority =
    ticket.priority === undefined
      ? defaultTicketPriority
      : parseTicketPriority(ticket.priority);
  const points =
    ticket.points === undefined || ticket.points === null
      ? null
      : parseTicketPoints(ticket.points);
  const epic =
    ticket.epic === undefined || ticket.epic === null
      ? null
      : parseEpic(ticket.epic);
  const labels = ticket.labels === undefined ? [] : parseLabels(ticket.labels);
  return {
    type,
    priority,
    points,
    epic,
    labels,
  };
}

function parseTicketType(value: unknown): TicketType {
  if (typeof value === "string" && ticketTypes.includes(value as TicketType))
    return value as TicketType;
  throw new Error("Unsupported ticket type");
}

function parseTicketPriority(value: unknown): TicketPriority {
  if (
    typeof value === "string" &&
    ticketPriorities.includes(value as TicketPriority)
  )
    return value as TicketPriority;
  throw new Error("Unsupported ticket priority");
}

function parseTicketPoints(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 100)
    throw new Error("Ticket points must be an integer from 1 to 100");
  return Number(value);
}

function parseEpic(value: unknown): string {
  const epic = requireString(value, "Epic");
  if (epic.length > 120) throw new Error("Epic is too long");
  return epic;
}

function parseLabels(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > 8)
    throw new Error("Ticket labels must be an array of up to 8 labels");
  const labels = value.map((candidate) => {
    const label = requireString(candidate, "Ticket label");
    if (label.length > 32) throw new Error("Ticket label is too long");
    return label;
  });
  if (
    new Set(labels.map((label) => label.toLowerCase())).size !== labels.length
  )
    throw new Error("Ticket labels must be unique");
  return labels;
}

export function parseRepositoryRequest(value: unknown): {
  repositoryPath: string;
} {
  const repositoryPath = requireString(
    requireRecord(value, "Repository request").repositoryPath,
    "Repository path",
  );
  if (
    repositoryPath.length > 4096 ||
    // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point.
    /[\x00-\x1f]/u.test(repositoryPath)
  )
    throw new Error("Invalid repository path");
  return { repositoryPath };
}
