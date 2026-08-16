import { contextBridge } from "electron";

import type { StaveDesktopApi } from "./shared/desktop-api";

const desktopApi: StaveDesktopApi = Object.freeze({
  platform: process.platform,
});

contextBridge.exposeInMainWorld("stave", desktopApi);
