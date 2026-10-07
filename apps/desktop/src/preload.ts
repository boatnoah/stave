import { contextBridge, ipcRenderer } from "electron";

import type { StaveDesktopApi } from "./shared/desktop-api";
import {
  ipcChannels,
  parseWorkspaceEvent,
  parseWorkspaceSnapshot,
} from "./shared/ipc-contract";

const desktopApi: StaveDesktopApi = Object.freeze({
  platform: process.platform,
  workspace: Object.freeze<StaveDesktopApi["workspace"]>({
    getSnapshot: async () =>
      parseWorkspaceSnapshot(
        await ipcRenderer.invoke(ipcChannels.getWorkspaceSnapshot),
      ),
  }),
  projects: Object.freeze<StaveDesktopApi["projects"]>({
    create: async (request) =>
      parseWorkspaceSnapshot(
        await ipcRenderer.invoke(ipcChannels.createProject, request),
      ),
  }),
  tickets: Object.freeze<StaveDesktopApi["tickets"]>({
    create: async (request) =>
      parseWorkspaceSnapshot(
        await ipcRenderer.invoke(ipcChannels.createTicket, request),
      ),
  }),
  runs: Object.freeze<StaveDesktopApi["runs"]>({
    start: async (request) =>
      parseWorkspaceSnapshot(
        await ipcRenderer.invoke(ipcChannels.startRun, request),
      ),
    cancel: async (request) =>
      parseWorkspaceSnapshot(
        await ipcRenderer.invoke(ipcChannels.cancelRun, request),
      ),
  }),
  events: Object.freeze<StaveDesktopApi["events"]>({
    subscribe: (listener) => {
      const handleEvent = (_event: Electron.IpcRendererEvent, value: unknown) =>
        listener(parseWorkspaceEvent(value));
      ipcRenderer.on(ipcChannels.workspaceEvent, handleEvent);
      return () =>
        ipcRenderer.removeListener(ipcChannels.workspaceEvent, handleEvent);
    },
  }),
});

contextBridge.exposeInMainWorld("stave", desktopApi);
