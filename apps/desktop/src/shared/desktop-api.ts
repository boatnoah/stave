import type { WorkspaceEvent, WorkspaceSnapshot } from "./workspace-snapshot";

export interface CreateProjectRequest {
  readonly name: string;
  readonly repositoryPath?: string;
}

export interface RepositoryRequest {
  readonly repositoryPath: string;
}

export interface CreateTicketRequest {
  readonly title: string;
  readonly description: string;
}
export interface StartRunRequest {
  readonly ticketId: string;
  readonly mode: "simulation";
}
export interface TicketRequest {
  readonly ticketId: string;
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
  readonly events: {
    readonly subscribe: (
      listener: (event: WorkspaceEvent) => void,
    ) => () => void;
  };
}
