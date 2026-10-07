import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

test("renderer stays sandboxed and isolated from Node", async () => {
  const dataDirectory = mkdtempSync(path.join(tmpdir(), "stave-e2e-"));
  const app = await electron.launch({
    args: [path.resolve(__dirname, "..")],
    env: { ...process.env, STAVE_DATA_DIR: dataDirectory },
  });
  try {
    const page = await app.firstWindow();
    const preferences = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      const prefs = window?.webContents.getLastWebPreferences();
      return {
        contextIsolation: prefs?.contextIsolation,
        nodeIntegration: prefs?.nodeIntegration,
        sandbox: prefs?.sandbox,
      };
    });
    expect(preferences).toEqual({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    });
    const exposed = await page.evaluate(() => ({
      require: typeof (globalThis as { require?: unknown }).require,
      process: typeof (globalThis as { process?: unknown }).process,
      stave: typeof (globalThis as { stave?: unknown }).stave,
    }));
    expect(exposed).toEqual({
      require: "undefined",
      process: "undefined",
      stave: "object",
    });
  } finally {
    await app.close();
    rmSync(dataDirectory, { recursive: true, force: true });
  }
});
