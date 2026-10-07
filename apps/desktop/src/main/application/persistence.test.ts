import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openStaveStore } from "./persistence";
import { StaveApplication } from "./stave-application";
const paths: string[] = [];
afterEach(() => {
  for (const path of paths.splice(0))
    rmSync(path, { recursive: true, force: true });
});
function databasePath() {
  const dir = mkdtempSync(join(tmpdir(), "stave-restart-"));
  paths.push(dir);
  return join(dir, "workspace.sqlite");
}
describe("durable application", () => {
  it("restores project identity, ticket, completed runs and activity after reopening", async () => {
    const path = databasePath();
    const store = openStaveStore(path);
    const app = new StaveApplication(
      async () => ({ state: "succeeded", summary: "Verified" }),
      store,
    );
    app.createProject({ name: "Durable" });
    const ticket = app.createTicket({
      title: "Persist me",
      description: "Keep identity",
    }).tickets[0];
    if (!ticket) throw new Error("Ticket missing");
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    await vi.waitFor(() =>
      expect(app.getSnapshot().tickets[0]?.stage).toBe("done"),
    );
    const expected = app.getSnapshot();
    await app.shutdown();
    store.close();
    const reopened = openStaveStore(path);
    try {
      expect(new StaveApplication(undefined, reopened).getSnapshot()).toEqual(
        expected,
      );
      expect(reopened.readEvents()).toHaveLength(expected.revision + 1);
    } finally {
      reopened.close();
    }
  });
  it("reconciles an abandoned running attempt without automatically dispatching it", () => {
    const path = databasePath();
    const store = openStaveStore(path);
    const app = new StaveApplication(() => new Promise(() => {}), store);
    app.createProject({ name: "Interrupted" });
    const ticket = app.createTicket({ title: "Unfinished", description: "" })
      .tickets[0];
    if (!ticket) throw new Error("Ticket missing");
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    store.close();
    const reopened = openStaveStore(path);
    const runner = vi.fn();
    try {
      const restored = new StaveApplication(runner, reopened).getSnapshot();
      expect(restored.tickets[0]).toMatchObject({
        id: ticket.id,
        stage: "implementation",
        execution: "interrupted",
      });
      expect(restored.runs[0]?.state).toBe("interrupted");
      expect(runner).not.toHaveBeenCalled();
      expect(reopened.load()).toEqual(restored);
    } finally {
      reopened.close();
    }
  });
  it("reports asynchronous storage failure and preserves the last saved state", async () => {
    const store = openStaveStore(databasePath());
    const fatal = vi.fn();
    let finish: () => void = () => {};
    const app = new StaveApplication(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ state: "succeeded", summary: "Finished" });
        }),
      store,
      fatal,
    );
    app.createProject({ name: "Storage failure" });
    const ticket = app.createTicket({ title: "Run", description: "" })
      .tickets[0];
    if (!ticket) throw new Error("Missing ticket");
    app.startRun({ ticketId: ticket.id, mode: "simulation" });
    const before = app.getSnapshot();
    store.close();
    finish();
    await vi.waitFor(() => expect(fatal).toHaveBeenCalledOnce());
    expect(app.getSnapshot()).toEqual(before);
    await app.shutdown();
  });
  it("does not publish or mutate memory when a durable write fails", () => {
    const store = openStaveStore(databasePath());
    const app = new StaveApplication(undefined, store);
    const before = app.getSnapshot();
    const listener = vi.fn();
    app.subscribe(listener);
    store.close();
    expect(() => app.createProject({ name: "Cannot save" })).toThrow();
    expect(app.getSnapshot()).toEqual(before);
    expect(listener).not.toHaveBeenCalled();
  });
});
