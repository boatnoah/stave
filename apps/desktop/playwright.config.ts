import { defineConfig } from "@playwright/test";

// Drives the production Vite bundle in `.vite/` with the stock Electron
// binary. Build it first with `pnpm --filter @stave/desktop package`.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  outputDir: "test-results",
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
});
