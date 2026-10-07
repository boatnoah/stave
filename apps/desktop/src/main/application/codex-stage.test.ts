import { describe, expect, it, vi } from "vitest";
import type { CodexRunOptions } from "@stave/agent-runtime";
import { codexPrompt, createCodexStageRunner } from "./codex-stage";
import type { StageInput } from "./stave-application";

function input(overrides: Partial<StageInput> = {}): StageInput {
  return {
    ticket: {
      id: "t1",
      title: "Add dark mode",
      description: "Follow the system theme.",
      stage: "implementation",
      execution: "running",
      mode: "codex",
      assignedAgentId: "a1",
      runId: "r1",
      output: "",
      workspace: { path: "/work/t1", branch: "stave/ticket/t1", dirty: false },
    },
    stage: "implementation",
    agent: { id: "a1", displayName: "Alex", role: "engineer", avatarSeed: "s", enabled: true },
    signal: new AbortController().signal,
    onOutput: () => {},
    ...overrides,
  };
}

describe("createCodexStageRunner", () => {
  it("runs Codex in the ticket workspace and streams its output", async () => {
    const output: string[] = [];
    const run = vi.fn(async (options: CodexRunOptions) => {
      options.onEvent?.({ kind: "status", message: "thinking" });
      options.onEvent?.({ kind: "output", text: "Done." });
      return { kind: "waiting_capacity" as const, summary: "Usage limit reached.", output: "Done." };
    });
    const stage = input({ onOutput: (text) => output.push(text) });
    const outcome = await createCodexStageRunner(run)(stage);
    expect(outcome).toEqual({ state: "waiting_capacity", summary: "Usage limit reached." });
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ cwd: "/work/t1", signal: stage.signal }));
    expect(output.join("")).toContain("Done.");
    expect(output.join("")).not.toContain("thinking");
  });
  it("refuses to run without a workspace", async () => {
    const stage = input();
    await expect(
      createCodexStageRunner(vi.fn())({ ...stage, ticket: { ...stage.ticket, workspace: null } }),
    ).rejects.toThrow("Prepare a workspace");
  });
  it("includes the ticket and stage instructions in the prompt", () => {
    const prompt = codexPrompt(input({ stage: "review" }));
    expect(prompt).toContain("Add dark mode");
    expect(prompt).toContain("Follow the system theme.");
    expect(prompt).toContain("Review the uncommitted changes");
  });
});
