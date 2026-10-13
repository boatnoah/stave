import type {
  ProjectBoardSettings,
  TicketPriority,
  TicketType,
} from "@stave/domain";
import type {
  RunMode,
  WorkspaceEvent,
  WorkspaceSnapshot,
} from "./workspace-snapshot";

export interface CreateProjectRequest {
  readonly name: string;
  readonly repositoryPath?: string;
}

export interface RepositoryRequest {
  readonly repositoryPath: string;
}

export interface BoardSettingsRequest {
  readonly settings: ProjectBoardSettings;
}

export interface CreateTicketRequest {
  readonly title: string;
  readonly description: string;
  readonly type?: TicketType;
  readonly priority?: TicketPriority;
  readonly points?: number | null;
  readonly epic?: string | null;
  readonly labels?: readonly string[];
}
export interface StartRunRequest {
  readonly ticketId: string;
  readonly mode: RunMode;
}
export interface TicketRequest {
  readonly ticketId: string;
}
export interface SendChatMessageRequest {
  readonly text: string;
  readonly channel: "team" | "releases" | "ticket" | "direct";
  readonly ticketId?: string;
  readonly agentId?: string;
}

export interface AnswerDecisionRequest {
  readonly decisionId: string;
  readonly option: string;
}

export interface StaveDesktopApi {
  readonly platform: NodeJS.Platform;
  readonly workspace: {
    readonly getSnapshot: () => Promise<WorkspaceSnapshot>;
  };
  readonly projects: {
    readonly setRepository: (
      request: RepositoryRequest,
    ) => Promise<WorkspaceSnapshot>;
    readonly setBoardSettings: (
      request: BoardSettingsRequest,
    ) => Promise<WorkspaceSnapshot>;
    readonly create: (
      request: CreateProjectRequest,
    ) => Promise<WorkspaceSnapshot>;
  };
  readonly workspaces: {
    readonly prepare: (request: TicketRequest) => Promise<WorkspaceSnapshot>;
  };
  readonly tickets: {
    readonly create: (
      request: CreateTicketRequest,
    ) => Promise<WorkspaceSnapshot>;
  };
  readonly runs: {
    readonly start: (request: StartRunRequest) => Promise<WorkspaceSnapshot>;
    readonly cancel: (request: TicketRequest) => Promise<WorkspaceSnapshot>;
  };
  readonly chat: {
    readonly send: (
      request: SendChatMessageRequest,
    ) => Promise<WorkspaceSnapshot>;
  };
  readonly decisions: {
    readonly answer: (
      request: AnswerDecisionRequest,
    ) => Promise<WorkspaceSnapshot>;
  };
  readonly events: {
    readonly subscribe: (
      listener: (event: WorkspaceEvent) => void,
    ) => () => void;
  };
}
