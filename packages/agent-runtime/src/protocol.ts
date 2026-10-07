// These parsers project the fields Stave consumes from Codex 0.147.0's
// generated app-server schemas. Additional protocol fields remain opaque.
import { realpathSync } from "node:fs";

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a protocol object.");
  }
  return Object.fromEntries(Object.entries(value));
}

export function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected a protocol string.");
  return value;
}

export function verifyLocalThread(value: unknown, cwd: string): void {
  const thread = object(value);
  const sandbox = object(thread.sandbox);
  const workspace = realpathSync(cwd);
  if (
    realpathSync(string(thread.cwd)) !== workspace ||
    thread.approvalPolicy !== "on-request" ||
    thread.approvalsReviewer !== "user" ||
    sandbox.type !== "workspaceWrite" ||
    sandbox.networkAccess !== false ||
    sandbox.excludeTmpdirEnvVar !== true ||
    sandbox.excludeSlashTmp !== true ||
    !Array.isArray(sandbox.writableRoots) ||
    !sandbox.writableRoots.every(
      (root: unknown) => realpathSync(string(root)) === workspace,
    )
  ) {
    throw new Error(
      "Codex did not apply the required local workspace permissions.",
    );
  }
}

export function identifier(value: unknown): string {
  const id = string(value);
  if (id.length === 0)
    throw new Error("Expected a nonempty protocol identifier.");
  return id;
}

function requestId(value: unknown): string | number {
  if (
    typeof value === "string" ||
    (typeof value === "number" && Number.isSafeInteger(value))
  ) {
    return value;
  }
  throw new Error("Invalid protocol request identifier.");
}

export function parseMessage(line: string) {
  const data = object(JSON.parse(line));
  if (typeof data.method === "string") {
    const params = object(data.params ?? {});
    if ("id" in data) {
      return {
        kind: "request",
        id: requestId(data.id),
        method: data.method,
        params,
      } as const;
    }
    return { kind: "notification", method: data.method, params } as const;
  }
  const id = requestId(data.id);
  if ("error" in data) {
    const error = object(data.error);
    if (typeof error.code !== "number" || !Number.isInteger(error.code)) {
      throw new Error("Invalid protocol error code.");
    }
    return {
      kind: "error",
      id,
      message: string(error.message),
      data: error.data,
    } as const;
  }
  if (!("result" in data)) throw new Error("Protocol response has no result.");
  return { kind: "response", id, result: data.result } as const;
}

export function parseFailure(value: unknown) {
  const error = object(value);
  const message = string(error.message);
  const info = error.codexErrorInfo;
  let kind: "failed" | "waiting_capacity" | "waiting_user" = "failed";
  if (
    info === "usageLimitExceeded" ||
    info === "serverOverloaded" ||
    info === "sessionBudgetExceeded"
  ) {
    kind = "waiting_capacity";
  } else if (info === "unauthorized") {
    kind = "waiting_user";
  } else if (typeof info === "object" && info !== null) {
    for (const details of Object.values(info)) {
      if (typeof details !== "object" || details === null) continue;
      const status = object(details).httpStatusCode;
      if (status === 429 || status === 503) kind = "waiting_capacity";
      else if (status === 401) kind = "waiting_user";
    }
  }
  return { kind, summary: message };
}

export function parseTurn(value: unknown) {
  const turn = object(value);
  const id = identifier(turn.id);
  const status = turn.status;
  if (
    status !== "completed" &&
    status !== "failed" &&
    status !== "interrupted" &&
    status !== "inProgress"
  ) {
    throw new Error("Unknown Codex turn status.");
  }
  const error =
    turn.error === null || turn.error === undefined
      ? null
      : parseFailure(turn.error);
  if (status === "failed" && error === null)
    throw new Error("Failed Codex turn has no error.");
  return { id, status, error };
}

export type ProtocolMessage = ReturnType<typeof parseMessage>;
