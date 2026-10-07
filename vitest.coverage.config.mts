import { defineConfig } from "vitest/config";

// Runs every package's tests in one process for a combined coverage report.
// `pnpm test` still runs each package on its own.
export default defineConfig({
  test: {
    projects: ["packages/*", "apps/desktop"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**", "apps/desktop/src/**"],
      exclude: ["**/*.test.*", "apps/desktop/src/renderer/**"],
      reporter: ["text-summary", "json-summary", "html"],
      reportsDirectory: "coverage",
      // A floor a few points under the current numbers. Raise it as coverage grows.
      thresholds: { lines: 80, statements: 78, functions: 75, branches: 75 },
    },
  },
});
