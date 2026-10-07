import { describe, expect, it, vi } from "vitest";

import { StaveApplication } from "./stave-application";

describe("StaveApplication", () => {
  it("creates the default project team and publishes one snapshot", () => {
    const application = new StaveApplication();
    const listener = vi.fn();
    const unsubscribe = application.subscribe(listener);

    const snapshot = application.createProject({ name: "Stave", repositoryPath: "/repo" });

    expect(snapshot.revision).toBe(1);
    expect(snapshot.project?.agents.map((agent) => agent.displayName)).toEqual(["Maya", "Alex", "Sam"]);
    expect(listener).toHaveBeenCalledWith({ type: "workspace.changed", snapshot });
    unsubscribe();
    application.createProject({ name: "Other" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
