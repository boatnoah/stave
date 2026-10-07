#!/usr/bin/env node
import { spawn } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const mode = readFileSync("scenario", "utf8");
writeFileSync("pid", String(process.pid));
writeFileSync("arguments.json", JSON.stringify(process.argv.slice(2)));
const emit = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const response = (id, result) => emit({ id, result });
const notification = (method, params) => emit({ method, params });
const turn = (status, error = null) => ({ id: "turn-1", status, error });
const scope = { threadId: "thread-1", turnId: "turn-1" };
const input = createInterface({ input: process.stdin });
let initialized = false;
let threadStarted = false;

if (mode === "stubborn") {
  process.on("SIGTERM", () => {});
  setInterval(() => {}, 1000);
}

input.on("line", (line) => {
  const message = JSON.parse(line);
  appendFileSync("received.jsonl", `${line}\n`);
  if (message.method === "initialize") {
    if (mode === "exit") process.exit(7);
    if (mode === "request-timeout") return;
    if (mode === "malformed") {
      process.stdout.write("{not json}\n");
      return;
    }
    if (mode === "oversized") {
      process.stdout.write("a".repeat(1024 * 1024 + 1));
      return;
    }
    response(message.id, { userAgent: "fixture/0.147.0" });
  } else if (message.method === "initialized") {
    initialized = true;
  } else if (message.method === "config/read") {
    response(message.id, {
      config: {
        mcp_servers:
          mode === "bad-server-name"
            ? { "ambiguous.name": { enabled: true } }
            : { "fixture-remote": { enabled: true } },
      },
    });
  } else if (message.method === "thread/start") {
    if (!initialized) throw new Error("Missing initialized notification.");
    threadStarted = true;
    response(message.id, {
      thread: { id: "thread-1" },
      cwd: process.cwd(),
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandbox: {
        type: "workspaceWrite",
        writableRoots: [],
        networkAccess: mode === "unsafe-policy",
        excludeTmpdirEnvVar: true,
        excludeSlashTmp: true,
      },
    });
  } else if (message.method === "turn/start") {
    if (!threadStarted) throw new Error("Missing thread/start.");
    if (mode === "rpc-quota") {
      emit({
        id: message.id,
        error: {
          code: -32000,
          message: "Usage exhausted",
          data: { codexErrorInfo: "usageLimitExceeded" },
        },
      });
      return;
    }
    if (mode === "rpc-error") {
      emit({
        id: message.id,
        error: { code: -32000, message: "Bad configuration" },
      });
      return;
    }
    if (mode === "early-events") success();
    if (mode === "early-user") ask("item/tool/requestUserInput");
    response(message.id, { turn: turn("inProgress") });
    if (
      [
        "early-events",
        "early-user",
        "run-timeout",
        "abort",
        "stubborn",
      ].includes(mode)
    )
      return;
    if (mode === "success") {
      success();
      return;
    }
    if (mode === "orphan") {
      const descendant = spawn(
        process.execPath,
        ["-e", "setInterval(() => {}, 1000)"],
        { stdio: "ignore" },
      );
      writeFileSync("descendant-pid", String(descendant.pid));
      descendant.unref();
      success();
      return;
    }
    if (mode === "other-turn") {
      notification("turn/completed", {
        threadId: "thread-1",
        turn: { id: "other-turn", status: "completed" },
      });
      notification("item/agentMessage/delta", {
        ...scope,
        turnId: "other-turn",
        itemId: "other",
        delta: "wrong",
      });
      setTimeout(success, 20);
      return;
    }
    if (mode === "bad-event") {
      notification("item/agentMessage/delta", {
        ...scope,
        itemId: "item-1",
        delta: 42,
      });
      return;
    }
    if (mode === "output-limit") {
      for (let i = 0; i < 3; i++) {
        notification("item/agentMessage/delta", {
          ...scope,
          itemId: "item-1",
          delta: "x".repeat(800_000),
        });
      }
      return;
    }
    if (mode === "approval") {
      ask("item/commandExecution/requestApproval");
      return;
    }
    if (mode === "permissions") {
      ask("item/permissions/requestApproval");
      return;
    }
    if (mode === "user") {
      ask("item/tool/requestUserInput");
      return;
    }
    if (mode === "unsupported") {
      ask("item/tool/call");
      return;
    }
    if (mode === "interrupted") {
      notification("turn/completed", {
        threadId: scope.threadId,
        turn: turn("interrupted"),
      });
      return;
    }
    const error = {
      message:
        mode === "failure"
          ? "Command failed"
          : mode === "unauthorized"
            ? "Sign in again"
            : "Usage exhausted",
      codexErrorInfo:
        mode === "failure"
          ? "other"
          : mode === "unauthorized"
            ? "unauthorized"
            : mode === "http-quota"
              ? { httpConnectionFailed: { httpStatusCode: 429 } }
              : "usageLimitExceeded",
      additionalDetails: null,
    };
    notification("error", { ...scope, error, willRetry: mode === "retry" });
    if (mode === "retry") success();
    else
      notification("turn/completed", {
        threadId: scope.threadId,
        turn: turn("failed", error),
      });
  } else if (message.method === "turn/interrupt") {
    response(message.id, {});
    notification("turn/completed", {
      threadId: scope.threadId,
      turn: turn("interrupted"),
    });
  }
});
input.on("close", () => {
  if (mode !== "stubborn") process.exit(0);
});

function ask(method) {
  emit({
    id: "server-request",
    method,
    params: { ...scope, itemId: "item-1" },
  });
}
function success() {
  notification("item/agentMessage/delta", {
    ...scope,
    threadId: "another-thread",
    itemId: "noise",
    delta: "wrong",
  });
  notification("item/agentMessage/delta", {
    ...scope,
    itemId: "item-1",
    delta: "Completed ",
  });
  notification("item/agentMessage/delta", {
    ...scope,
    itemId: "item-1",
    delta: "fixture.",
  });
  notification("item/completed", {
    ...scope,
    item: { id: "item-1", type: "agentMessage", text: "Completed fixture." },
  });
  notification("turn/completed", {
    threadId: scope.threadId,
    turn: turn("completed"),
  });
}
