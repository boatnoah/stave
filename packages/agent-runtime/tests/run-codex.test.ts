import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { CodexRunEvent, CodexRunOptions } from "../src";
import { runCodex } from "../src";

const executable = fileURLToPath(
  new URL("./fixtures/codex-server.mjs", import.meta.url),
);
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function fixture(mode: string) {
  const cwd = await mkdtemp(join(tmpdir(), "stave-runtime-"));
  directories.push(cwd);
  await writeFile(join(cwd, "scenario"), mode);
  const options: CodexRunOptions = {
    cwd,
    prompt: "Complete the fixture",
    executable,
    timeouts: { requestMs: 2000, runMs: 3000, shutdownMs: 50 },
  };
  return { cwd, options };
}

async function messages(cwd: string): Promise<unknown[]> {
  return (await readFile(join(cwd, "received.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
}

async function expectStopped(cwd: string) {
  const pid = Number(await readFile(join(cwd, "pid"), "utf8"));
  expect(() => process.kill(pid, 0)).toThrow();
}

describe("Codex app-server stdio runtime", () => {
  it.each(["success", "early-events", "other-turn", "retry"])(
    "streams and completes %s with the matching thread and turn",
    async (mode) => {
      const { cwd, options } = await fixture(mode);
      const events: CodexRunEvent[] = [];
      const result = await runCodex({
        ...options,
        onEvent: (event) => events.push(event),
      });
      expect(result).toEqual({
        kind: "succeeded",
        summary: "Completed fixture.",
        output: "Completed fixture.",
        threadId: "thread-1",
      });
      expect(
        events
          .filter((event) => event.kind === "output")
          .map((event) => event.text)
          .join(""),
      ).toBe("Completed fixture.");
      await expectStopped(cwd);
    },
  );

  it("uses the existing CLI session, default model and restrictive workspace permissions", async () => {
    const { cwd, options } = await fixture("success");
    await runCodex(options);
    expect(await messages(cwd)).toEqual([
      expect.objectContaining({
        method: "initialize",
        params: {
          clientInfo: { name: "stave", title: "Stave", version: "0.0.0" },
          capabilities: { experimentalApi: false },
        },
      }),
      { method: "initialized", params: {} },
      expect.objectContaining({
        method: "config/read",
        params: { cwd, includeLayers: false },
      }),
      expect.objectContaining({
        method: "thread/start",
        params: {
          cwd,
          approvalPolicy: "on-request",
          approvalsReviewer: "user",
          sandbox: "workspace-write",
          config: {
            "features.apps": false,
            "features.plugins": false,
            "features.remote_plugin": false,
            "features.browser_use": false,
            "features.browser_use_external": false,
            "features.computer_use": false,
            "features.hooks": false,
            "features.image_generation": false,
            "features.multi_agent": false,
            "features.skill_mcp_dependency_install": false,
            "mcp_servers.fixture-remote.enabled": false,
            "sandbox_workspace_write.network_access": false,
            "sandbox_workspace_write.writable_roots": [],
            "sandbox_workspace_write.exclude_tmpdir_env_var": true,
            "sandbox_workspace_write.exclude_slash_tmp": true,
            web_search: "disabled",
          },
          developerInstructions: expect.stringContaining(
            "Do not push branches",
          ),
        },
      }),
      expect.objectContaining({
        method: "turn/start",
        params: {
          threadId: "thread-1",
          cwd,
          input: [
            { type: "text", text: "Complete the fixture", text_elements: [] },
          ],
          approvalPolicy: "on-request",
          approvalsReviewer: "user",
          sandboxPolicy: {
            type: "workspaceWrite",
            writableRoots: [cwd],
            networkAccess: false,
            excludeTmpdirEnvVar: true,
            excludeSlashTmp: true,
          },
        },
      }),
    ]);
    const argumentsPassed: unknown = JSON.parse(
      await readFile(join(cwd, "arguments.json"), "utf8"),
    );
    expect(argumentsPassed).toEqual([
      "app-server",
      "--listen",
      "stdio://",
      "--disable",
      "apps",
      "--disable",
      "plugins",
      "--disable",
      "remote_plugin",
      "--disable",
      "browser_use",
      "--disable",
      "browser_use_external",
      "--disable",
      "computer_use",
      "--disable",
      "hooks",
      "--disable",
      "image_generation",
      "--disable",
      "multi_agent",
      "--disable",
      "skill_mcp_dependency_install",
    ]);
  });

  it("fails before creating a thread if an inherited server cannot be disabled safely", async () => {
    const { cwd, options } = await fixture("bad-server-name");
    expect(await runCodex(options)).toMatchObject({
      kind: "failed",
      summary: expect.stringContaining("unsupported name"),
    });
    expect(await messages(cwd)).not.toContainEqual(
      expect.objectContaining({ method: "thread/start" }),
    );
    await expectStopped(cwd);
  });

  it("does not start a turn if Codex reports weaker workspace permissions", async () => {
    const { cwd, options } = await fixture("unsafe-policy");
    expect(await runCodex(options)).toMatchObject({
      kind: "failed",
      summary: expect.stringContaining("required local workspace permissions"),
    });
    expect(await messages(cwd)).not.toContainEqual(
      expect.objectContaining({ method: "turn/start" }),
    );
    await expectStopped(cwd);
  });

  it.skipIf(process.platform === "win32")(
    "kills descendants after the app-server exits normally",
    async () => {
      const { cwd, options } = await fixture("orphan");
      expect(await runCodex(options)).toMatchObject({ kind: "succeeded" });
      const pid = Number(await readFile(join(cwd, "descendant-pid"), "utf8"));
      await expect
        .poll(() => {
          try {
            process.kill(pid, 0);
            return true;
          } catch {
            return false;
          }
        })
        .toBe(false);
    },
  );

  it.each([
    ["failure", "failed", "Command failed"],
    ["quota", "waiting_capacity", "Usage exhausted"],
    ["http-quota", "waiting_capacity", "Usage exhausted"],
    ["rpc-quota", "waiting_capacity", "Usage exhausted"],
    ["unauthorized", "waiting_user", "Sign in again"],
    ["rpc-error", "failed", "Bad configuration"],
    ["interrupted", "canceled", "Codex interrupted the turn."],
  ])("maps %s to %s", async (mode, kind, summary) => {
    const { cwd, options } = await fixture(mode);
    expect(await runCodex(options)).toMatchObject({ kind, summary });
    await expectStopped(cwd);
  });

  it.each([
    ["approval", { decision: "decline" }],
    ["permissions", { permissions: {}, scope: "turn" }],
    ["user", { answers: {} }],
    ["early-user", { answers: {} }],
  ])(
    "declines %s and returns waiting_user without hanging",
    async (mode, response) => {
      const { cwd, options } = await fixture(String(mode));
      expect(await runCodex(options)).toMatchObject({ kind: "waiting_user" });
      expect(await messages(cwd)).toContainEqual({
        id: "server-request",
        result: response,
      });
      expect(await messages(cwd)).toContainEqual(
        expect.objectContaining({
          method: "turn/interrupt",
          params: { threadId: "thread-1", turnId: "turn-1" },
        }),
      );
      await expectStopped(cwd);
    },
  );

  it("rejects unsupported server requests explicitly", async () => {
    const { cwd, options } = await fixture("unsupported");
    expect(await runCodex(options)).toMatchObject({ kind: "waiting_user" });
    expect(await messages(cwd)).toContainEqual({
      id: "server-request",
      error: {
        code: -32601,
        message: "Stave does not support interactive server requests.",
      },
    });
  });

  it.each([
    ["malformed", "Invalid Codex protocol"],
    ["bad-event", "Expected a protocol string"],
    ["oversized", "exceeded 1 MiB"],
    ["output-limit", "exceeded the 2 MiB limit"],
    ["exit", "exited before completing"],
    ["request-timeout", "initialize timed out"],
    ["run-timeout", "run timed out"],
  ])("bounds and fails %s", async (mode, summary) => {
    const { cwd, options } = await fixture(mode);
    const result = await runCodex({
      ...options,
      timeouts: { requestMs: 250, runMs: 450, shutdownMs: 50 },
    });
    expect(result.kind).toBe("failed");
    expect(result.summary).toContain(summary);
    await expectStopped(cwd);
  });

  it.each(["abort", "stubborn"])(
    "interrupts and cleans up an aborted %s process",
    async (mode) => {
      const { cwd, options } = await fixture(mode);
      const controller = new AbortController();
      let cancel: ReturnType<typeof setTimeout> | undefined;
      const result = await runCodex({
        ...options,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.kind === "thread")
            cancel = setTimeout(() => controller.abort(), 30);
        },
      });
      clearTimeout(cancel);
      expect(result.kind).toBe("canceled");
      expect(await messages(cwd)).toContainEqual(
        expect.objectContaining({ method: "turn/interrupt" }),
      );
      await expectStopped(cwd);
    },
  );

  it("does not spawn after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      await runCodex({
        cwd: "/missing",
        prompt: "unused",
        executable: "/missing",
        signal: controller.signal,
      }),
    ).toEqual({ kind: "canceled", summary: "Run canceled.", output: "" });
  });

  it("returns a failed outcome for a missing executable", async () => {
    expect(
      await runCodex({
        cwd: tmpdir(),
        prompt: "unused",
        executable: "/missing/stave-codex",
      }),
    ).toMatchObject({
      kind: "failed",
      summary: expect.stringContaining("Could not start Codex"),
    });
  });

  it("cleans up when the output consumer throws", async () => {
    const { cwd, options } = await fixture("success");
    const result = await runCodex({
      ...options,
      onEvent: () => {
        throw new Error("renderer disconnected");
      },
    });
    expect(result).toMatchObject({
      kind: "failed",
      summary: "Run event handler failed: renderer disconnected",
    });
    await expectStopped(cwd);
  });
});
