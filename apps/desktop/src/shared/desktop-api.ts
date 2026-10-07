import type { WorkspaceEvent, WorkspaceSnapshot } from "./workspace-snapshot";

export interface CreateProjectRequest {
  readonly name: string;
  readonly repositoryPath?: string;
}

export interface StaveDesktopApi {
  readonly platform: NodeJS.Platform;
  readonly workspace: {
    readonly getSnapshot: () => Promise<WorkspaceSnapshot>;
  };
  readonly projects: {
    readonly create: (request: CreateProjectRequest) => Promise<WorkspaceSnapshot>;
  };
  readonly events: {
    readonly subscribe: (listener: (event: WorkspaceEvent) => void) => () => void;
  };
}
