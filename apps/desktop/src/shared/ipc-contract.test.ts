import { describe, expect, it } from "vitest";

import {
  parseBoardSettingsRequest,
  parseCreateProjectRequest,
  parseWorkspaceSnapshot,
} from "./ipc-contract";

describe("IPC contract validation", () => {
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
      tickets: [],
      activity: [],
      runs: [],
    });

    expect(snapshot.project?.boardSettings).toEqual({
      wipLimits: { implementation: 2, review: 1, qa: 2 },
      showNeedsLane: false,
    });
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
