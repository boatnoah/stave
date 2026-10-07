import { describe, expect, it } from "vitest";
import type { IpcMainInvokeEvent } from "electron";
import { StaveApplication } from "../application/stave-application";
import { registerStaveIpc } from "./register-stave-ipc";
import { ipcChannels } from "../../shared/ipc-contract";

describe("IPC authorization", () => {
  it("rejects untrusted frames before accessing or mutating state and removes handlers on dispose", () => {
    const handlers = new Map<string, (event: IpcMainInvokeEvent, request?: unknown) => unknown>();
    const application = new StaveApplication();
    const dispose = registerStaveIpc({
      ipcMain: { handle: (channel, handler) => { handlers.set(channel, handler); }, removeHandler: (channel) => { handlers.delete(channel); } },
      application,
      isTrustedSender: () => false,
      sendToRenderers: () => {},
    });
    const event = {} as IpcMainInvokeEvent;
    expect(() => handlers.get(ipcChannels.getWorkspaceSnapshot)?.(event)).toThrow("Untrusted");
    expect(() => handlers.get(ipcChannels.createProject)?.(event, { name: "Injected" })).toThrow("Untrusted");
    expect(application.getSnapshot().project).toBeNull();
    dispose();
    expect(handlers.size).toBe(0);
  });
});
