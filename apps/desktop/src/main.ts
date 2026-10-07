import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { openStaveStore } from "./main/application/persistence";
import { pathToFileURL } from "node:url";

import { StaveApplication } from "./main/application/stave-application";
import { registerStaveIpc } from "./main/ipc/register-stave-ipc";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const dataDirectory = process.env.STAVE_DATA_DIR ?? app.getPath("userData");
let store: ReturnType<typeof openStaveStore>;
let staveApplication: StaveApplication;
try {
  mkdirSync(dataDirectory, { recursive: true });
  app.setPath("userData", dataDirectory);
  if (!app.requestSingleInstanceLock()) app.exit(0);
  store = openStaveStore(path.join(dataDirectory, "stave.sqlite"));
  staveApplication = new StaveApplication(undefined, store, (error) => {
    dialog.showErrorBox("Stave could not save this run", `${error instanceof Error ? error.message : String(error)}\nStave will close to preserve the last saved state. Reopen it after resolving the storage problem.`);
    app.exit(1);
  });
} catch (error) {
  dialog.showErrorBox("Stave could not open your workspace", `${error instanceof Error ? error.message : String(error)}\nYour existing data has been kept. Quit other Stave instances or restore a valid database before reopening.`);
  app.exit(1);
  throw error;
}
const trustedRenderers = new Map<number, string>();

registerStaveIpc({
  ipcMain,
  application: staveApplication,
  isTrustedSender: (event) =>
    event.senderFrame === event.sender.mainFrame &&
    event.senderFrame?.url === trustedRenderers.get(event.sender.id),
  sendToRenderers: (channel, event) => {
    for (const window of BrowserWindow.getAllWindows())
      window.webContents.send(channel, event);
  },
});

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 880,
    minHeight: 640,
    backgroundColor: "#f3eee4",
    titleBarStyle: "hiddenInset",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    const currentUrl = window.webContents.getURL();
    if (currentUrl && url !== currentUrl) {
      event.preventDefault();
    }
  });

  const rendererFile = path.join(
    __dirname,
    `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
  );
  trustedRenderers.set(
    window.webContents.id,
    MAIN_WINDOW_VITE_DEV_SERVER_URL
      ? new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).href
      : pathToFileURL(rendererFile).href,
  );
  const rendererId = window.webContents.id;
  window.on("closed", () => trustedRenderers.delete(rendererId));
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(rendererFile);
  }

  window.once("ready-to-show", () => window.show());
  return window;
}

void app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

let quitting = false;
app.on("before-quit", (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  void staveApplication.shutdown().finally(() => {
    store.close();
    app.quit();
  });
});
