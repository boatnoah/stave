import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CorruptWorkspaceStoreError,
  openWorkspaceStore,
  StaleWorkspaceRevisionError,
  UnsupportedWorkspaceSchemaError,
  type WorkspaceStore,
} from "../src";

function parseStrings(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item): item is string => typeof item === "string")
  ) {
    throw new Error("Expected a string array");
  }
  return value;
}

function parseSnapshot(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("revision" in value) ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !("name" in value) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    !("team" in value) ||
    !("tickets" in value) ||
    !("runs" in value) ||
    !("events" in value)
  ) {
    throw new Error("Invalid snapshot");
  }
  return {
    revision: value.revision,
    name: value.name,
    team: parseStrings(value.team),
    tickets: parseStrings(value.tickets),
    runs: parseStrings(value.runs),
    events: parseStrings(value.events),
  };
}

function parseEvent(value: unknown): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error("Invalid event");
  return value;
}

type Snapshot = ReturnType<typeof parseSnapshot>;

const initialSnapshot: Snapshot = {
  revision: 0,
  name: "Delivery workspace",
  team: ["maya", "alex", "sam"],
  tickets: ["ticket-1"],
  runs: ["run-1"],
  events: ["workspace.created"],
};

describe("durable workspace store", () => {
  let directory: string;
  let path: string;
  let stores: WorkspaceStore<Snapshot, string>[];

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "stave-store-"));
    path = join(directory, "workspace.sqlite");
    stores = [];
  });

  afterEach(() => {
    for (const store of stores) store.close();
    rmSync(directory, { recursive: true, force: true });
  });

  function open() {
    const store = openWorkspaceStore({ path, parseSnapshot, parseEvent });
    stores.push(store);
    return store;
  }

  function seed() {
    const store = open();
    store.save({
      snapshot: initialSnapshot,
      event: "workspace.created",
      expectedRevision: null,
    });
    return store;
  }

  it("migrates an empty file and preserves the whole workspace and ordered events across reopen", () => {
    const store = open();
    expect(store.load()).toBeNull();
    expect(store.readEvents()).toEqual([]);
    store.save({
      snapshot: initialSnapshot,
      event: "workspace.created",
      expectedRevision: null,
    });
    const next = {
      ...initialSnapshot,
      revision: 1,
      tickets: ["ticket-1", "ticket-2"],
    };
    store.save({
      snapshot: next,
      event: "ticket.created",
      expectedRevision: 0,
    });
    store.close();

    const reopened = open();
    expect(reopened.load()).toEqual(next);
    expect(reopened.readEvents()).toEqual([
      { sequence: 1, revision: 0, event: "workspace.created" },
      { sequence: 2, revision: 1, event: "ticket.created" },
    ]);
    const inspection = new DatabaseSync(path);
    expect(inspection.prepare("PRAGMA user_version").get()?.user_version).toBe(
      1,
    );
    inspection.close();
  });

  it("rejects stale writers without replacing the committed snapshot or appending their event", () => {
    const first = seed();
    const second = open();
    expect(second.load()?.revision).toBe(0);
    const committed = { ...initialSnapshot, revision: 1, name: "First writer" };
    first.save({
      snapshot: committed,
      event: "first.updated",
      expectedRevision: 0,
    });
    expect(() =>
      second.save({
        snapshot: { ...initialSnapshot, revision: 1, name: "Stale writer" },
        event: "second.updated",
        expectedRevision: 0,
      }),
    ).toThrow(StaleWorkspaceRevisionError);
    expect(second.load()).toEqual(committed);
    expect(second.readEvents().map((entry) => entry.event)).toEqual([
      "workspace.created",
      "first.updated",
    ]);
    expect(() =>
      second.save({
        snapshot: initialSnapshot,
        event: "second.created",
        expectedRevision: null,
      }),
    ).toThrow(StaleWorkspaceRevisionError);
  });

  it("rolls back the snapshot when appending its event fails", () => {
    const store = seed();
    const inspection = new DatabaseSync(path);
    inspection.exec(`
      CREATE TRIGGER fail_append BEFORE INSERT ON workspace_events
      BEGIN SELECT RAISE(ABORT, 'disk-write-test'); END;
    `);
    expect(() =>
      store.save({
        snapshot: { ...initialSnapshot, revision: 1, name: "Must not persist" },
        event: "ticket.created",
        expectedRevision: 0,
      }),
    ).toThrow("disk-write-test");
    expect(store.load()).toEqual(initialSnapshot);
    expect(store.readEvents()).toHaveLength(1);
    inspection.exec("DROP TRIGGER fail_append");
    inspection.close();
    store.close();
    expect(open().load()).toEqual(initialSnapshot);
  });

  it("rejects invalid snapshots, events, and skipped revisions before any data is lost", () => {
    const store = seed();
    expect(() =>
      store.save({
        snapshot: { ...initialSnapshot, revision: 1, name: "" },
        event: "workspace.updated",
        expectedRevision: 0,
      }),
    ).toThrow("Invalid snapshot");
    expect(() =>
      store.save({
        snapshot: { ...initialSnapshot, revision: 1 },
        event: "",
        expectedRevision: 0,
      }),
    ).toThrow("Invalid event");
    expect(() =>
      store.save({
        snapshot: { ...initialSnapshot, revision: 3 },
        event: "workspace.updated",
        expectedRevision: 0,
      }),
    ).toThrow("must have revision 1");
    expect(store.load()).toEqual(initialSnapshot);
    expect(store.readEvents()).toHaveLength(1);
  });

  it("refuses future schemas without changing their contents", () => {
    const database = new DatabaseSync(path);
    database.exec(
      "CREATE TABLE future_data (value TEXT); INSERT INTO future_data VALUES ('keep me'); PRAGMA user_version = 9",
    );
    database.close();
    const before = readFileSync(path);
    expect(open).toThrow(UnsupportedWorkspaceSchemaError);
    expect(readFileSync(path)).toEqual(before);
  });

  it("validates the revision that custom JSON serialization would actually store", () => {
    const store = seed();
    const snapshot = {
      ...initialSnapshot,
      revision: 1,
      toJSON: () => initialSnapshot,
    };
    expect(() =>
      store.save({ snapshot, event: "workspace.updated", expectedRevision: 0 }),
    ).toThrow("must have revision 1");
    expect(store.load()).toEqual(initialSnapshot);
    expect(store.readEvents()).toHaveLength(1);
  });

  it("refuses an unversioned database containing unrelated tables", () => {
    const database = new DatabaseSync(path);
    database.exec("CREATE TABLE unrelated (value TEXT)");
    database.close();
    expect(open).toThrow("Unversioned database already contains tables");
  });

  it("refuses corrupt database bytes without replacing the file", () => {
    writeFileSync(path, "not a sqlite database");
    expect(open).toThrow();
    expect(readFileSync(path, "utf8")).toBe("not a sqlite database");
  });

  it("refuses malformed schema declarations", () => {
    const database = new DatabaseSync(path);
    database.exec(
      "CREATE TABLE workspace (id INTEGER); PRAGMA user_version = 1",
    );
    database.close();
    expect(open).toThrow();
  });

  it("rejects stored JSON that fails the snapshot parser", () => {
    seed().close();
    const database = new DatabaseSync(path);
    database
      .prepare("UPDATE workspace SET snapshot_json = ?")
      .run(JSON.stringify("invalid snapshot"));
    database.close();
    expect(open).toThrow(CorruptWorkspaceStoreError);
  });

  it("rejects a mismatched snapshot revision", () => {
    seed().close();
    const database = new DatabaseSync(path);
    database
      .prepare("UPDATE workspace SET snapshot_json = ?")
      .run(JSON.stringify({ ...initialSnapshot, revision: 12 }));
    database.close();
    expect(open).toThrow("snapshot revision does not match");
  });

  it("rejects missing or invalid event history instead of silently repairing it", () => {
    seed().close();
    const database = new DatabaseSync(path);
    database
      .prepare("UPDATE workspace_events SET event_json = ?")
      .run(JSON.stringify(123));
    expect(open).toThrow("Cannot read workspace event");
    database.exec("DELETE FROM workspace_events");
    database.close();
    expect(open).toThrow("event history does not match");
  });
});
