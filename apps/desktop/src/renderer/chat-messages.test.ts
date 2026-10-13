import { describe, expect, it } from "vitest";

import type {
  AgentSnapshot,
  WorkspaceSnapshot,
} from "../shared/workspace-snapshot";
import { buildChatMessages, isSuccessfulRelease } from "./chat-messages";

const agents: readonly AgentSnapshot[] = [
  {
    id: "maya-id",
    displayName: "Maya",
    role: "tech_lead",
    avatarSeed: "maya-seed",
    enabled: true,
  },
];

const snapshot: WorkspaceSnapshot = {
  revision: 3,
  project: null,
  tickets: [],
  activity: [
    {
      id: "created",
      ticketId: "ticket-1",
      message: "Created ticket: Improve the board",
      createdAt: "2026-10-13T10:00:00.000Z",
    },
    {
      id: "started",
      ticketId: "ticket-1",
      message: "Maya started review with Codex",
      createdAt: "2026-10-13T10:01:00.000Z",
    },
    {
      id: "summary",
      ticketId: "ticket-1",
      message: "Review passed.",
      createdAt: "2026-10-13T10:02:00.000Z",
    },
  ],
  runs: [
    {
      id: "review-run",
      ticketId: "ticket-1",
      agentId: "maya-id",
      stage: "review",
      state: "succeeded",
      summary: "Review passed.",
    },
  ],
};

describe("buildChatMessages", () => {
  it("combines activity and run summaries without duplicating completion text", () => {
    const messages = buildChatMessages(snapshot, agents);

    expect(messages).toHaveLength(3);
    expect(messages.map(({ author, text }) => ({ author, text }))).toEqual([
      { author: "You", text: "Created ticket: Improve the board" },
      { author: "Maya", text: "Maya started review with Codex" },
      { author: "Maya", text: "Review passed." },
    ]);
    expect(messages[2]).toMatchObject({
      kind: "run",
      role: "Tech lead",
      createdAt: "2026-10-13T10:02:00.000Z",
    });
  });

  it("marks only successful QA run messages as release events", () => {
    const messages = buildChatMessages(
      {
        ...snapshot,
        runs: [
          {
            id: "qa-run",
            ticketId: "ticket-1",
            agentId: "maya-id",
            stage: "qa",
            state: "succeeded",
            summary: "QA passed.",
          },
        ],
        activity: [
          ...snapshot.activity,
          {
            id: "qa-summary",
            ticketId: "ticket-1",
            message: "QA passed.",
            createdAt: "2026-10-13T10:03:00.000Z",
          },
        ],
      },
      agents,
    );

    expect(
      isSuccessfulRelease(messages[3]!, [
        {
          id: "qa-run",
          ticketId: "ticket-1",
          agentId: "maya-id",
          stage: "qa",
          state: "succeeded",
          summary: "QA passed.",
        },
      ]),
    ).toBe(true);
  });
});
