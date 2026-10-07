import { describe, expect, it, vi } from "vitest";
import { StaveApplication, type StageRunner } from "./stave-application";
import { parseWorkspaceSnapshot } from "../../shared/ipc-contract";
function setup(runner?: StageRunner) {
  const app = new StaveApplication(runner);
  app.createProject({ name: "Stave", repositoryPath: "/repo" });
  const ticket = app.createTicket({
    title: "Build the board",
    description: "Display real state",
  }).tickets[0];
  if (!ticket) throw new Error("Missing ticket");
  return { app, ticket };
}
describe("StaveApplication", () => {
  it("serializes workspace preparation and preserves existing dirty workspace details", async () => {
    let ready: (value: {
      path: string;
      branch: string;
      dirty: boolean;
    }) => void = () => {};
    const provider = vi.fn(
      () =>
        new Promise<{ path: string; branch: string; dirty: boolean }>(
          (resolve) => {
            ready = resolve;
          },
        ),
    );
    const app = new StaveApplication(undefined, undefined, undefined, provider);
    app.createProject({ name: "Git", repositoryPath: "/repo" });
    const ticket = app.createTicket({ title: "Ticket", description: "" })
      .tickets[0];
    if (!ticket) throw new Error("Missing ticket");
    const preparing = app.prepareWorkspace({ ticketId: ticket.id });
    await expect(app.prepareWorkspace({ ticketId: ticket.id })).rejects.toThrow(
      "active work",
    );
    expect(() =>
      app.startRun({ ticketId: ticket.id, mode: "simulation" }),
    ).toThrow("already active");
    expect(() => app.setRepository({ repositoryPath: "/other" })).toThrow(
      "cannot change",
    );
    ready({ path: "/work/ticket", branch: "stave/ticket/a", dirty: true });
    const prepared = await preparing;
    expect(prepared.tickets[0]?.workspace).toEqual({
      path: "/work/ticket",
      branch: "stave/ticket/a",
      dirty: true,
    });
    expect(provider).toHaveBeenCalledWith({
      repositoryPath: "/repo",
      ticketId: ticket.id,
    });
    expect(() => app.setRepository({ repositoryPath: "/other" })).toThrow(
      "cannot change",
    );
  });
  it("leaves a failed workspace preparation retryable without replacing ticket state", async () => {
    const app = new StaveApplication(
      undefined,
      undefined,
      undefined,
      async () => {
        throw new Error("Invalid repository");
      },
    );
    app.createProject({ name: "Git" });
    const ticket = app.createTicket({ title: "Ticket", description: "" })
      .tickets[0];
    if (!ticket) throw new Error("Missing ticket");
    await expect(app.prepareWorkspace({ ticketId: ticket.id })).rejects.toThrow(
      "repository path",
    );
    app.setRepository({ repositoryPath: "/missing" });
    await expect(app.prepareWorkspace({ ticketId: ticket.id })).rejects.toThrow(
      "Invalid repository",
    );
    expect(app.getSnapshot().tickets[0]?.workspace).toBeNull();
    expect(() =>
      app.setRepository({ repositoryPath: "/corrected" }),
    ).not.toThrow();
  });

  it("creates the project team and valid wire snapshots, and unsubscribes", () => {
    const app = new StaveApplication();
    const listener = vi.fn();
    const off = app.subscribe(listener);
    const snapshot = app.createProject({ name: "Stave" });
    expect(snapshot.project?.agents.map((a) => a.displayName)).toEqual([
      "Maya",
      "Alex",
      "Sam",
    ]);
    expect(parseWorkspaceSnapshot(snapshot)).toEqual(snapshot);
    expect(listener).toHaveBeenCalledWith({
      type: "workspace.changed",
      snapshot,
    });
    off();
    app.createTicket({ title: "A", description: "" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() => app.createProject({ name: "Other" })).toThrow(
      "already exists",
    );
  });
  it("routes every stage to the correct role and completes only after QA", async () => {
    const roles: string[] = [];
    const { app, ticket } = setup(async ({ agent, stage, onOutput }) => {
      roles.push(agent.role);
      onOutput(`${stage} verified\n`);
      return { state: "succeeded", summary: `${stage} passed` };
    });
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    await vi.waitFor(() =>
      expect(app.getSnapshot().tickets[0]?.stage).toBe("done"),
    );
    expect(roles).toEqual(["engineer", "tech_lead", "qa"]);
    expect(app.getSnapshot().runs.map((r) => r.state)).toEqual([
      "succeeded",
      "succeeded",
      "succeeded",
    ]);
    expect(app.getSnapshot().tickets[0]?.output).toBe(
      "implementation verified\nreview verified\nqa verified\n",
    );
  });
  it("rejects duplicate dispatch and ignores late success after cancellation", async () => {
    const { app, ticket } = setup(
      ({ signal }) =>
        new Promise((resolve) =>
          signal.addEventListener(
            "abort",
            () => resolve({ state: "succeeded", summary: "Late success" }),
            { once: true },
          ),
        ),
    );
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    expect(() =>
      app.startRun({ ticketId: ticket.id, mode: "simulation" }),
    ).toThrow("already active");
    await app.cancelRun({ ticketId: ticket.id });
    expect(app.getSnapshot().tickets[0]).toMatchObject({
      stage: "implementation",
      execution: "canceled",
    });
    expect(app.getSnapshot().runs).toHaveLength(1);
  });
  it("preserves unfinished work on capacity exhaustion and resumes the same stage", async () => {
    let available = false;
    const { app, ticket } = setup(async () =>
      available
        ? { state: "succeeded", summary: "Passed" }
        : { state: "waiting_capacity", summary: "Usage limit" },
    );
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    await vi.waitFor(() =>
      expect(app.getSnapshot().tickets[0]?.execution).toBe("waiting_capacity"),
    );
    expect(app.getSnapshot().tickets[0]?.stage).toBe("implementation");
    available = true;
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    await vi.waitFor(() =>
      expect(app.getSnapshot().tickets[0]?.stage).toBe("done"),
    );
    expect(app.getSnapshot().runs).toHaveLength(4);
  });
  it("keeps a failed review unfinished and does not dispatch QA", async () => {
    const { app, ticket } = setup(async ({ stage }) => ({
      state: stage === "review" ? "failed" : "succeeded",
      summary: stage === "review" ? "Regression found" : "Passed",
    }));
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    await vi.waitFor(() =>
      expect(app.getSnapshot().tickets[0]?.execution).toBe("failed"),
    );
    expect(app.getSnapshot().tickets[0]?.stage).toBe("review");
    expect(app.getSnapshot().runs).toHaveLength(2);
  });
  it("prepares a workspace for Codex and runs every stage inside it", async () => {
    const workspace = { path: "/work/a", branch: "stave/ticket/a", dirty: false };
    const provider = vi.fn(async () => workspace);
    const cwds: (string | undefined)[] = [];
    const simulation = vi.fn<StageRunner>();
    const app = new StaveApplication(simulation, undefined, undefined, provider, async ({ ticket }) => {
      cwds.push(ticket.workspace?.path);
      return { state: "succeeded", summary: "Passed" };
    });
    app.createProject({ name: "Codex", repositoryPath: "/repo" });
    const ticket = app.createTicket({ title: "Ticket", description: "" }).tickets[0];
    if (!ticket) throw new Error("Missing ticket");
    app.startRun({ ticketId: ticket.id, mode: "codex" });
    await vi.waitFor(() => expect(app.getSnapshot().tickets[0]?.stage).toBe("done"));
    expect(cwds).toEqual(["/work/a", "/work/a", "/work/a"]);
    expect(simulation).not.toHaveBeenCalled();
    expect(app.getSnapshot().tickets[0]).toMatchObject({ mode: "codex", workspace });
    expect(parseWorkspaceSnapshot(app.getSnapshot())).toEqual(app.getSnapshot());
  });
  it("keeps a ticket on the mode it started with", async () => {
    const { app, ticket } = setup(async () => ({ state: "failed", summary: "No" }));
    expect(() => app.startRun({ ticketId: ticket.id, mode: "codex" })).toThrow("unavailable");
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    await vi.waitFor(() => expect(app.getSnapshot().tickets[0]?.execution).toBe("failed"));
    expect(() => app.startRun({ ticketId: ticket.id, mode: "codex" })).toThrow("already uses simulation");
  });
  it("fails a Codex run without touching earlier runs when preparation fails", async () => {
    const app = new StaveApplication(undefined, undefined, undefined, async () => {
      throw new Error("Invalid repository");
    }, vi.fn<StageRunner>());
    app.createProject({ name: "Codex", repositoryPath: "/repo" });
    const ticket = app.createTicket({ title: "Ticket", description: "" }).tickets[0];
    if (!ticket) throw new Error("Missing ticket");
    app.startRun({ ticketId: ticket.id, mode: "codex" });
    await vi.waitFor(() => expect(app.getSnapshot().tickets[0]?.execution).toBe("failed"));
    expect(app.getSnapshot().runs).toEqual([]);
    expect(app.getSnapshot().activity.at(-1)?.message).toBe("Invalid repository");
  });
  it("reads tickets saved before run modes as simulations", () => {
    const { app } = setup();
    const { mode: _mode, ...legacy } = app.getSnapshot().tickets[0]!;
    const parsed = parseWorkspaceSnapshot({ ...app.getSnapshot(), tickets: [legacy] });
    expect(parsed.tickets[0]?.mode).toBe("simulation");
  });
  it("protects internal state from snapshot mutation", () => {
    const { app } = setup();
    Object.assign(app.getSnapshot().tickets[0] ?? {}, { stage: "done" });
    expect(app.getSnapshot().tickets[0]?.stage).toBe("todo");
  });
});
