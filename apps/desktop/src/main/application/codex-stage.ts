import type { CodexRunOptions, CodexRunResult } from "@stave/agent-runtime";
import type { StageInput, StageRunner, WorkStage } from "./stave-application";

const instructions: Record<WorkStage, string> = {
  implementation:
    "Implement this ticket in the current workspace. Keep the change focused, follow the existing code style, and run the project's relevant checks.",
  review:
    "Review the uncommitted changes in this workspace against the ticket as a tech lead. Fix correctness problems and unclear code directly. Do not expand the scope.",
  qa: "Verify the changes in this workspace satisfy the ticket. Run the project's tests and checks, fix any failures caused by this work, and report what you verified.",
};

export function codexPrompt({ ticket, stage, agent }: StageInput): string {
  return [
    `You are ${agent.displayName}, working the ${stage} stage of a ticket.`,
    instructions[stage],
    "",
    `Ticket: ${ticket.title}`,
    ticket.description ? `\n${ticket.description}` : "",
    "",
    "Leave changes uncommitted. Finish with a short summary of what changed and which checks ran.",
  ].join("\n");
}

export function createCodexStageRunner(
  run: (options: CodexRunOptions) => Promise<CodexRunResult>,
): StageRunner {
  return async (input) => {
    const cwd = input.ticket.workspace?.path;
    if (!cwd) throw new Error("Prepare a workspace before running Codex");
    input.onOutput(`\n— ${input.agent.displayName} · ${input.stage} —\n`);
    const result = await run({
      cwd,
      prompt: codexPrompt(input),
      signal: input.signal,
      onEvent: (event) => {
        if (event.kind === "output") input.onOutput(event.text);
      },
    });
    return { state: result.kind, summary: result.summary };
  };
}
