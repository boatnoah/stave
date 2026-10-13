import type {
  AgentSnapshot,
  RunSnapshot,
  WorkspaceSnapshot,
} from "../shared/workspace-snapshot";

type ChatMessageKind = "activity" | "run" | "system" | "user";

export interface ChatMessage {
  readonly id: string;
  readonly kind: ChatMessageKind;
  readonly ticketId: string | null;
  readonly agentId: string | null;
  readonly author: string;
  readonly role: string | null;
  readonly text: string;
  readonly createdAt: string;
}

const agentRoles: Record<AgentSnapshot["role"], string> = {
  tech_lead: "Tech lead",
  engineer: "Engineer",
  qa: "Quality assurance",
};

export function buildChatMessages(
  snapshot: WorkspaceSnapshot,
  agents: readonly AgentSnapshot[],
): readonly ChatMessage[] {
  const activityMessages = snapshot.activity.flatMap((entry) => {
    if (
      snapshot.runs.some(
        (run) =>
          run.ticketId === entry.ticketId && run.summary === entry.message,
      )
    )
      return [];

    const agent = agents.find((candidate) =>
      entry.message.startsWith(`${candidate.displayName} started `),
    );
    const isUser = entry.message.startsWith("Created ticket:");
    return [
      {
        id: `activity-${entry.id}`,
        kind: agent ? "activity" : isUser ? "user" : "system",
        ticketId: entry.ticketId,
        agentId: agent?.id ?? null,
        author: agent?.displayName ?? (isUser ? "You" : "Stave"),
        role: agent ? agentRoles[agent.role] : null,
        text: entry.message,
        createdAt: entry.createdAt,
      } satisfies ChatMessage,
    ];
  });

  const runMessages = snapshot.runs.flatMap((run) => {
    if (!run.summary) return [];
    const agent = agents.find((candidate) => candidate.id === run.agentId);
    const completion = snapshot.activity.find(
      (entry) =>
        entry.ticketId === run.ticketId && entry.message === run.summary,
    );
    if (!agent) return [];
    return [
      {
        id: `run-${run.id}`,
        kind: "run" as const,
        ticketId: run.ticketId,
        agentId: agent.id,
        author: agent.displayName,
        role: agentRoles[agent.role],
        text: run.summary,
        createdAt: completion?.createdAt ?? "",
      },
    ];
  });

  return [...activityMessages, ...runMessages].sort((left, right) => {
    const byTime = left.createdAt.localeCompare(right.createdAt);
    return byTime || left.id.localeCompare(right.id);
  });
}

export function isSuccessfulRelease(
  message: ChatMessage,
  runs: readonly RunSnapshot[],
): boolean {
  if (message.kind !== "run") return false;
  const run = runs.find((candidate) => `run-${candidate.id}` === message.id);
  return run?.stage === "qa" && run.state === "succeeded";
}
