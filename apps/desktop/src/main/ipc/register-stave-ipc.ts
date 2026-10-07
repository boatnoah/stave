import type { IpcMain, IpcMainInvokeEvent } from "electron";

import { ipcChannels, parseCreateProjectRequest } from "../../shared/ipc-contract";
import type { WorkspaceEvent } from "../../shared/workspace-snapshot";
import type { StaveApplication } from "../application/stave-application";

interface RegisterStaveIpcInput {
  readonly ipcMain: Pick<IpcMain, "handle" | "removeHandler">;
  readonly application: StaveApplication;
  readonly sendToRenderers: (channel: string, event: WorkspaceEvent) => void;
  readonly isTrustedSender: (event: IpcMainInvokeEvent) => boolean;
}

export function registerStaveIpc({ ipcMain, application, sendToRenderers, isTrustedSender }: RegisterStaveIpcInput): () => void {
  const authorize = (event: IpcMainInvokeEvent) => {
    if (!isTrustedSender(event)) throw new Error("Untrusted Stave request");
  };
  ipcMain.handle(ipcChannels.getWorkspaceSnapshot, (event) => {
    authorize(event);
    return application.getSnapshot();
  });
  ipcMain.handle(ipcChannels.createProject, (event, request: unknown) => {
    authorize(event);
    return application.createProject(parseCreateProjectRequest(request));
  });
  const unsubscribe = application.subscribe((event) => sendToRenderers(ipcChannels.workspaceEvent, event));

  return () => {
    unsubscribe();
    ipcMain.removeHandler(ipcChannels.getWorkspaceSnapshot);
    ipcMain.removeHandler(ipcChannels.createProject);
  };
}
