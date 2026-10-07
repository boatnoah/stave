import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { ProtocolMessage } from "./protocol";
import {
  identifier,
  object,
  parseFailure,
  parseMessage,
  parseTurn,
  string,
  verifyLocalThread,
} from "./protocol";

export type CodexRunEvent =
  | { kind: "output"; text: string }
  | { kind: "status"; message: string }
  | { kind: "thread"; threadId: string };

type ResultDetails = { summary: string; output: string; threadId?: string };
export type CodexRunResult = ResultDetails &
  (
    | { kind: "succeeded" }
    | { kind: "failed" }
    | { kind: "canceled" }
    | { kind: "waiting_capacity" }
    | { kind: "waiting_user" }
  );

export type CodexRunOptions = {
  cwd: string;
  prompt: string;
  signal?: AbortSignal;
  onEvent?: (event: CodexRunEvent) => void;
  executable?: string;
  timeouts?: { requestMs?: number; runMs?: number; shutdownMs?: number };
};

type Outcome = Pick<CodexRunResult, "kind" | "summary">;
type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
type Notification = Extract<ProtocolMessage, { kind: "notification" }>;
const MAX_LINE_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_EARLY_EVENTS = 256;
const DISABLED_FEATURES = [
  "apps",
  "plugins",
  "remote_plugin",
  "browser_use",
  "browser_use_external",
  "computer_use",
  "hooks",
  "image_generation",
  "multi_agent",
  "skill_mcp_dependency_install",
];

function timeout(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647) {
    throw new Error("Codex timeouts must be positive integer milliseconds.");
  }
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown Codex runtime error.";
}

export async function runCodex(
  options: CodexRunOptions,
): Promise<CodexRunResult> {
  if (options.signal?.aborted)
    return { kind: "canceled", summary: "Run canceled.", output: "" };
  const requestMs = timeout(options.timeouts?.requestMs, 15_000);
  const runMs = timeout(options.timeouts?.runMs, 15 * 60_000);
  const shutdownMs = timeout(options.timeouts?.shutdownMs, 1_000);
  const cwd = resolve(options.cwd);
  const child = spawn(
    options.executable ?? "codex",
    [
      "app-server",
      "--listen",
      "stdio://",
      ...DISABLED_FEATURES.flatMap((feature) => ["--disable", feature]),
    ],
    {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      detached: process.platform !== "win32",
      windowsHide: true,
    },
  );
  const pending = new Map<number | string, PendingRequest>();
  let nextId = 1;
  let threadId: string | undefined;
  let turnId: string | undefined;
  let output = "";
  let outputBytes = 0;
  let stderr = "";
  let lineBuffer = "";
  let earlyBytes = 0;
  let completed = false;
  let exited = false;
  let finalAgentText = "";
  const streamedItems = new Map<string, string>();
  const earlyEvents: Notification[] = [];
  let finish: (outcome: Outcome) => void = () => {};
  const outcome = new Promise<Outcome>((resolveOutcome) => {
    finish = (result) => {
      if (completed) return;
      completed = true;
      resolveOutcome(result);
    };
  });
  let markClosed: () => void = () => {};
  const closed = new Promise<void>((resolveClosed) => {
    markClosed = resolveClosed;
  });

  function emit(event: CodexRunEvent) {
    if (completed) return;
    try {
      options.onEvent?.(event);
    } catch (error) {
      finish({
        kind: "failed",
        summary: `Run event handler failed: ${errorMessage(error)}`,
      });
    }
  }

  function send(message: unknown) {
    if (exited || child.stdin.destroyed)
      throw new Error("Codex input pipe is closed.");
    child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  function request(method: string, params: unknown): Promise<unknown> {
    if (completed) return Promise.reject(new Error("Run already ended."));
    const id = nextId++;
    return new Promise((resolveRequest, rejectRequest) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        rejectRequest(new Error(`Codex ${method} timed out.`));
      }, requestMs);
      pending.set(id, {
        resolve: resolveRequest,
        reject: rejectRequest,
        timer,
      });
      try {
        send({ id, method, params });
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        rejectRequest(new Error(errorMessage(error)));
      }
    });
  }

  function append(text: string) {
    outputBytes += Buffer.byteLength(text);
    if (outputBytes > MAX_OUTPUT_BYTES)
      throw new Error("Codex output exceeded the 2 MiB limit.");
    output += text;
    emit({ kind: "output", text });
  }

  function completeTurn(value: unknown) {
    const turn = parseTurn(value);
    if (turn.id !== turnId) return;
    switch (turn.status) {
      case "completed":
        finish({
          kind: "succeeded",
          summary:
            finalAgentText || output.trim() || "Codex completed the turn.",
        });
        break;
      case "interrupted":
        finish({ kind: "canceled", summary: "Codex interrupted the turn." });
        break;
      case "failed":
        finish(
          turn.error ?? { kind: "failed", summary: "Codex failed the turn." },
        );
        break;
      case "inProgress":
        break;
    }
  }

  function notification(message: Notification) {
    const { method, params } = message;
    if (params.threadId !== threadId || threadId === undefined) return;
    const eventTurnId =
      method === "turn/completed" || method === "turn/started"
        ? identifier(object(params.turn).id)
        : params.turnId;
    if (turnId === undefined) {
      earlyBytes += Buffer.byteLength(JSON.stringify(message));
      if (
        earlyEvents.length >= MAX_EARLY_EVENTS ||
        earlyBytes > MAX_LINE_BYTES
      ) {
        throw new Error("Codex sent too many events before the turn response.");
      }
      earlyEvents.push(message);
      return;
    }
    if (eventTurnId !== turnId) return;
    switch (method) {
      case "item/agentMessage/delta": {
        const id = identifier(params.itemId);
        const delta = string(params.delta);
        streamedItems.set(id, (streamedItems.get(id) ?? "") + delta);
        append(delta);
        break;
      }
      case "item/commandExecution/outputDelta":
        append(string(params.delta));
        break;
      case "item/started": {
        const item = object(params.item);
        emit({
          kind: "status",
          message: `Codex started ${string(item.type)}.`,
        });
        break;
      }
      case "item/completed": {
        const item = object(params.item);
        if (item.type !== "agentMessage") break;
        const id = identifier(item.id);
        const text = string(item.text);
        const streamed = streamedItems.get(id) ?? "";
        if (text.startsWith(streamed)) append(text.slice(streamed.length));
        else if (streamed.length === 0) append(text);
        finalAgentText = text;
        streamedItems.delete(id);
        break;
      }
      case "error": {
        const failure = parseFailure(params.error);
        if (typeof params.willRetry !== "boolean")
          throw new Error("Invalid Codex retry flag.");
        emit({ kind: "status", message: failure.summary });
        if (!params.willRetry) finish(failure);
        break;
      }
      case "turn/completed":
        completeTurn(params.turn);
        break;
      case "stave/waitingUser":
        finish({ kind: "waiting_user", summary: string(params.message) });
        break;
    }
  }

  function serverRequest(
    message: Extract<ProtocolMessage, { kind: "request" }>,
  ) {
    const { method, id, params } = message;
    switch (method) {
      case "item/commandExecution/requestApproval":
      case "item/fileChange/requestApproval":
        send({ id, result: { decision: "decline" } });
        break;
      case "item/permissions/requestApproval":
        send({ id, result: { permissions: {}, scope: "turn" } });
        break;
      case "item/tool/requestUserInput":
        send({ id, result: { answers: {} } });
        break;
      case "mcpServer/elicitation/request":
        send({ id, result: { action: "decline", content: null } });
        break;
      case "execCommandApproval":
      case "applyPatchApproval":
        send({ id, result: { decision: "abort" } });
        break;
      default:
        send({
          id,
          error: {
            code: -32601,
            message: "Stave does not support interactive server requests.",
          },
        });
    }
    const summary = `Codex needs user action for ${method}. The request was declined.`;
    if (params.threadId === undefined)
      finish({ kind: "waiting_user", summary });
    else if (params.threadId === threadId && params.turnId === undefined) {
      finish({ kind: "waiting_user", summary });
    } else {
      notification({
        kind: "notification",
        method: "stave/waitingUser",
        params: {
          threadId: params.threadId,
          turnId: params.turnId,
          message: summary,
        },
      });
    }
  }

  function receive(line: string) {
    const message = parseMessage(line);
    if (message.kind === "request") {
      serverRequest(message);
      return;
    }
    if (message.kind === "notification") {
      notification(message);
      return;
    }
    const waiting = pending.get(message.id);
    if (!waiting) return;
    clearTimeout(waiting.timer);
    pending.delete(message.id);
    if (message.kind === "error") {
      if (message.data !== undefined && message.data !== null) {
        const data = object(message.data);
        if ("codexErrorInfo" in data)
          finish(parseFailure({ ...data, message: message.message }));
      }
      waiting.reject(new Error(message.message));
    } else waiting.resolve(message.result);
  }

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    if (completed) return;
    try {
      lineBuffer += chunk;
      let newline = lineBuffer.indexOf("\n");
      while (newline >= 0 && !completed) {
        const line = lineBuffer.slice(0, newline).trim();
        lineBuffer = lineBuffer.slice(newline + 1);
        if (Buffer.byteLength(line) > MAX_LINE_BYTES)
          throw new Error("Codex protocol line exceeded 1 MiB.");
        if (line) receive(line);
        newline = lineBuffer.indexOf("\n");
      }
      if (Buffer.byteLength(lineBuffer) > MAX_LINE_BYTES)
        throw new Error("Codex protocol line exceeded 1 MiB.");
    } catch (error) {
      finish({
        kind: "failed",
        summary: `Invalid Codex protocol: ${errorMessage(error)}`,
      });
    }
  });
  child.stderr.on("data", (chunk: string) => {
    stderr = (stderr + chunk).slice(-4096);
  });
  child.stdin.on("error", (error) =>
    finish({ kind: "failed", summary: `Codex input failed: ${error.message}` }),
  );
  child.on("error", (error) =>
    finish({
      kind: "failed",
      summary: `Could not start Codex: ${error.message}`,
    }),
  );
  child.on("close", (code, signal) => {
    exited = true;
    markClosed();
    finish({
      kind: "failed",
      summary: `Codex exited before completing the turn (${signal ?? code ?? "unknown"}).${stderr ? ` ${stderr.trim()}` : ""}`,
    });
  });
  const abort = () => finish({ kind: "canceled", summary: "Run canceled." });
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const runTimer = setTimeout(
    () => finish({ kind: "failed", summary: "Codex run timed out." }),
    runMs,
  );

  const start = async () => {
    const initialized = object(
      await request("initialize", {
        clientInfo: { name: "stave", title: "Stave", version: "0.0.0" },
        capabilities: { experimentalApi: false },
      }),
    );
    string(initialized.userAgent);
    if (completed) return;
    send({ method: "initialized", params: {} });
    const configuration = object(
      object(await request("config/read", { cwd, includeLayers: false }))
        .config,
    );
    const mcpServers = object(configuration.mcp_servers ?? {});
    const disabledServers: Record<string, false> = {};
    for (const name of Object.keys(mcpServers)) {
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new Error(
          "Cannot safely disable an inherited Codex MCP server with an unsupported name.",
        );
      }
      disabledServers[`mcp_servers.${name}.enabled`] = false;
    }
    if (completed) return;
    const started = object(
      await request("thread/start", {
        cwd,
        approvalPolicy: "on-request",
        approvalsReviewer: "user",
        sandbox: "workspace-write",
        config: {
          ...Object.fromEntries(
            DISABLED_FEATURES.map((feature) => [`features.${feature}`, false]),
          ),
          ...disabledServers,
          "sandbox_workspace_write.network_access": false,
          "sandbox_workspace_write.writable_roots": [],
          "sandbox_workspace_write.exclude_tmpdir_env_var": true,
          "sandbox_workspace_write.exclude_slash_tmp": true,
          web_search: "disabled",
        },
        developerInstructions:
          "Complete only the requested local workspace task. Do not push branches, create pull requests, merge, deploy, or send messages. Report changes and checks in your final response.",
      }),
    );
    verifyLocalThread(started, cwd);
    threadId = identifier(object(started.thread).id);
    emit({ kind: "thread", threadId });
    if (completed) return;
    const startedTurn = object(
      await request("turn/start", {
        threadId,
        cwd,
        input: [{ type: "text", text: options.prompt, text_elements: [] }],
        approvalPolicy: "on-request",
        approvalsReviewer: "user",
        sandboxPolicy: {
          type: "workspaceWrite",
          writableRoots: [cwd],
          networkAccess: false,
          excludeTmpdirEnvVar: true,
          excludeSlashTmp: true,
        },
      }),
    );
    turnId = parseTurn(startedTurn.turn).id;
    for (const event of earlyEvents) {
      if (completed) break;
      notification(event);
    }
    earlyEvents.length = 0;
    if (!completed) completeTurn(startedTurn.turn);
  };
  const startup = start().catch((error: unknown) => {
    finish({ kind: "failed", summary: errorMessage(error) });
  });

  const result = await outcome;
  clearTimeout(runTimer);
  options.signal?.removeEventListener("abort", abort);
  for (const waiting of pending.values()) {
    clearTimeout(waiting.timer);
    waiting.reject(new Error("Run ended."));
  }
  pending.clear();
  if (!exited) {
    try {
      if (threadId && turnId && result.kind !== "succeeded") {
        send({
          id: nextId++,
          method: "turn/interrupt",
          params: { threadId, turnId },
        });
      }
      child.stdin.end();
    } catch {
      /* A closed pipe is already part of process cleanup. */
    }
    await waitForClose(shutdownMs);
    if (!exited) {
      kill("SIGTERM");
      await waitForClose(shutdownMs);
    }
    if (!exited) {
      kill("SIGKILL");
      await waitForClose(shutdownMs);
    }
  }
  if (process.platform !== "win32") kill("SIGKILL");
  child.stdout.destroy();
  child.stderr.destroy();
  child.stdin.destroy();
  await startup;
  return { ...result, output, ...(threadId ? { threadId } : {}) };

  async function waitForClose(ms: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      closed,
      new Promise<void>((done) => {
        timer = setTimeout(done, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  function kill(signal: NodeJS.Signals) {
    try {
      if (process.platform !== "win32" && child.pid)
        process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ESRCH")
      ) {
        child.kill(signal);
      }
    }
  }
}
