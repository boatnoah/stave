import { describe, expect, it } from "vitest";

import {
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
});
