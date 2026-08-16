/// <reference types="vite/client" />

import type { StaveDesktopApi } from "../shared/desktop-api";

declare global {
  interface Window {
    readonly stave: StaveDesktopApi;
  }
}

export {};
