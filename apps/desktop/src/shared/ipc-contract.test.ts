import { describe, expect, it } from "vitest";

import {
  parseBoardSettingsRequest,
  parseCreateProjectRequest,
  parseCreateTicketRequest,
  parseSendChatMessageRequest,
  parseWorkspaceSnapshot,
} from "./ipc-contract";

describe("IPC contract validation", () => {
  it("validates chat channel context and message size", () => {
    expect(
      parseSendChatMessageRequest({ text: " hello ", channel: "team" }),
    ).toEqual({
      text: "hello",
      channel: "team",
    });
    expect(() =>
      parseSendChatMessageRequest({ text: "reply", channel: "ticket" }),
    ).toThrow("need a ticket");
    expect(() =>
      parseSendChatMessageRequest({ text: "x".repeat(4001), channel: "team" }),
    ).toThrow("too long");
  });

  it("normalizes project creation at the boundary", () => {
    expect(
      parseCreateProjectRequest({ name: " Stave ", repositoryPath: " /repo " }),
    ).toEqual({
      name: "Stave",
      repositoryPath: "/repo",
    });
    expect(() => parseCreateProjectRequest({ name: "" })).toThrow(
      "Project name",
    );
    expect(() =>
      parseCreateProjectRequest({ name: "Stave", repositoryPath: 4 }),
    ).toThrow("Repository path");
  });

  it("rejects malformed snapshots from the main process", () => {
    expect(() =>
      parseWorkspaceSnapshot({ revision: -1, project: null }),
    ).toThrow("revision");
    expect(() =>
      parseWorkspaceSnapshot({
        revision: 0,
        project: { teamTemplateVersion: 1, agents: "nope" },
      }),
    ).toThrow("agents");
    expect(() =>
      parseWorkspaceSnapshot({
        revision: 0,
        project: { teamTemplateVersion: "1", agents: [] },
      }),
    ).toThrow("version");
  });

  it("defaults board preferences for snapshots saved before board settings", () => {
    const snapshot = parseWorkspaceSnapshot({
      revision: 0,
      project: {
        id: "project-1",
        name: "Stave",
        repositoryPath: null,
        teamTemplateId: "software_delivery",
        teamTemplateVersion: 1,
        agents: [],
      },
      tickets: [
        {
          id: "ticket-1",
          title: "Old ticket",
          description: "",
          stage: "todo",
          execution: "ready",
          assignedAgentId: null,
          runId: null,
          output: "",
          workspace: null,
        },
      ],
      activity: [],
      runs: [],
    });

    expect(snapshot.project?.boardSettings).toEqual({
      wipLimits: { implementation: 2, review: 1, qa: 2 },
      showNeedsLane: false,
    });
    expect(snapshot.tickets[0]).toMatchObject({
      key: "STV-1",
      type: "task",
      priority: "medium",
      points: null,
      epic: null,
      labels: [],
      mode: "simulation",
    });
  });

  it("validates and normalizes ticket metadata at the IPC boundary", () => {
    expect(
      parseCreateTicketRequest({
        title: " Fix keyboard navigation ",
        description: "",
        type: "bug",
        priority: "urgent",
        points: 3,
        epic: " Board refresh ",
        labels: ["accessibility", "keyboard"],
      }),
    ).toEqual({
      title: "Fix keyboard navigation",
      description: "",
      type: "bug",
      priority: "urgent",
      points: 3,
      epic: "Board refresh",
      labels: ["accessibility", "keyboard"],
    });
    expect(() =>
      parseCreateTicketRequest({
        title: "Ticket",
        description: "",
        type: "unknown",
      }),
    ).toThrow("Unsupported ticket type");
    expect(() =>
      parseCreateTicketRequest({
        title: "Ticket",
        description: "",
        points: 0,
      }),
    ).toThrow("integer from 1 to 100");
    expect(() =>
      parseCreateTicketRequest({
        title: "Ticket",
        description: "",
        labels: ["UI", "ui"],
      }),
    ).toThrow("must be unique");
  });

  it("rejects persisted tickets with invalid keys", () => {
    expect(() =>
      parseWorkspaceSnapshot({
        revision: 0,
        project: null,
        tickets: [
          {
            id: "ticket-1",
            key: "OTHER-1",
            title: "Ticket",
            description: "",
            stage: "todo",
            execution: "ready",
            mode: "simulation",
            assignedAgentId: null,
            runId: null,
            output: "",
            workspace: null,
            type: "task",
            priority: "medium",
            points: null,
            epic: null,
            labels: [],
          },
        ],
        activity: [],
        runs: [],
      }),
    ).toThrow("Invalid ticket key");
  });

  it("validates board settings at the IPC boundary", () => {
    expect(
      parseBoardSettingsRequest({
        settings: {
          wipLimits: { implementation: 3, review: 1, qa: 4 },
          showNeedsLane: true,
        },
      }),
    ).toEqual({
      settings: {
        wipLimits: { implementation: 3, review: 1, qa: 4 },
        showNeedsLane: true,
      },
    });
    expect(() =>
      parseBoardSettingsRequest({
        settings: {
          wipLimits: { implementation: 0, review: 1, qa: 2 },
          showNeedsLane: false,
        },
      }),
    ).toThrow("integer from 1 to 20");
  });
});
