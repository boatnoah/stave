import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { StaveApplication } from "./main/application/stave-application";
import { registerStaveIpc } from "./main/ipc/register-stave-ipc";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

const staveApplication = new StaveApplication();
const trustedRenderers = new Map<number, string>();

registerStaveIpc({
  ipcMain,
  application: staveApplication,
  isTrustedSender: (event) => event.senderFrame === event.sender.mainFrame &&
    event.senderFrame?.url === trustedRenderers.get(event.sender.id),
  sendToRenderers: (channel, event) => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, event);
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

  const rendererFile = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
  trustedRenderers.set(window.webContents.id, MAIN_WINDOW_VITE_DEV_SERVER_URL ? new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).href : pathToFileURL(rendererFile).href);
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
