import { DatabaseSync } from "node:sqlite";

const schemaVersion = 1;

export class StaleWorkspaceRevisionError extends Error {
  constructor(
    readonly expectedRevision: number | null,
    readonly actualRevision: number | null,
  ) {
    super(
      `Workspace revision changed: expected ${expectedRevision}, found ${actualRevision}`,
    );
    this.name = "StaleWorkspaceRevisionError";
  }
}

export class UnsupportedWorkspaceSchemaError extends Error {
  constructor(readonly version: number) {
    super(
      `Workspace database schema ${version} is unsupported; this application supports ${schemaVersion}`,
    );
    this.name = "UnsupportedWorkspaceSchemaError";
  }
}

export class CorruptWorkspaceStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CorruptWorkspaceStoreError";
  }
}

export interface StoredWorkspaceEvent<Event> {
  readonly sequence: number;
  readonly revision: number;
  readonly event: Event;
}

export interface WorkspaceStore<Snapshot extends { revision: number }, Event> {
  load(): Snapshot | null;
  save(change: {
    snapshot: Snapshot;
    event: Event;
    expectedRevision: number | null;
  }): void;
  readEvents(): StoredWorkspaceEvent<Event>[];
  close(): void;
}

export function openWorkspaceStore<
  Snapshot extends { revision: number },
  Event,
>(options: {
  path: string;
  parseSnapshot: (value: unknown) => Snapshot;
  parseEvent: (value: unknown) => Event;
}): WorkspaceStore<Snapshot, Event> {
  const database = new DatabaseSync(options.path);
  let closed = false;

  function close(): void {
    if (!closed) {
      database.close();
      closed = true;
    }
  }

  function load(): Snapshot | null {
    const row = database
      .prepare("SELECT revision, snapshot_json FROM workspace WHERE id = 1")
      .get();
    if (!row) return null;
    const revision = readRevision(row.revision);
    const snapshot = parseStoredJson(
      row.snapshot_json,
      options.parseSnapshot,
      "workspace snapshot",
    );
    if (snapshot.revision !== revision) {
      throw new CorruptWorkspaceStoreError(
        "Workspace snapshot revision does not match its stored revision",
      );
    }
    return snapshot;
  }

  function readEvents(): StoredWorkspaceEvent<Event>[] {
    return database
      .prepare(
        "SELECT sequence, revision, event_json FROM workspace_events ORDER BY sequence",
      )
      .all()
      .map((row) => ({
        sequence: readPositiveInteger(row.sequence, "event sequence"),
        revision: readRevision(row.revision),
        event: parseStoredJson(
          row.event_json,
          options.parseEvent,
          "workspace event",
        ),
      }));
  }

  try {
    database.exec("PRAGMA busy_timeout = 5000");
    migrate(database);
    transaction(database, () => {
      verifyDatabase(database);
      const snapshot = load();
      const events = readEvents();
      if (
        events.length !== (snapshot === null ? 0 : snapshot.revision + 1) ||
        events.some((entry, index) => entry.revision !== index)
      ) {
        throw new CorruptWorkspaceStoreError(
          "Workspace event history does not match its snapshot revision",
        );
      }
    });
    database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL");
  } catch (error) {
    close();
    throw error;
  }

  return {
    load,
    readEvents,
    close,
    save({ snapshot, event, expectedRevision }): void {
      const serializedSnapshot = serialize(
        snapshot,
        options.parseSnapshot,
        "snapshot",
      );
      const serializedEvent = serialize(event, options.parseEvent, "event");
      const nextRevision =
        expectedRevision === null ? 0 : readRevision(expectedRevision) + 1;
      if (
        !Number.isSafeInteger(nextRevision) ||
        snapshot.revision !== nextRevision ||
        serializedSnapshot.value.revision !== nextRevision
      ) {
        throw new Error(
          `Workspace snapshot must have revision ${nextRevision}`,
        );
      }
      transaction(database, () => {
        const actualRevision = load()?.revision ?? null;
        if (actualRevision !== expectedRevision) {
          throw new StaleWorkspaceRevisionError(
            expectedRevision,
            actualRevision,
          );
        }
        database
          .prepare(
            `
          INSERT INTO workspace (id, revision, snapshot_json) VALUES (1, ?, ?)
          ON CONFLICT (id) DO UPDATE SET revision = excluded.revision, snapshot_json = excluded.snapshot_json
        `,
          )
          .run(snapshot.revision, serializedSnapshot.json);
        database
          .prepare(
            "INSERT INTO workspace_events (revision, event_json) VALUES (?, ?)",
          )
          .run(snapshot.revision, serializedEvent.json);
      });
    },
  };
}

function transaction<Value>(
  database: DatabaseSync,
  operation: () => Value,
): Value {
  database.exec("BEGIN IMMEDIATE");
  try {
    const value = operation();
    database.exec("COMMIT");
    return value;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function migrate(database: DatabaseSync): void {
  transaction(database, () => {
    const version = readRevision(
      database.prepare("PRAGMA user_version").get()?.user_version,
    );
    if (version > schemaVersion)
      throw new UnsupportedWorkspaceSchemaError(version);
    if (version === 0) {
      const existingTable = database
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
        )
        .get();
      if (existingTable)
        throw new CorruptWorkspaceStoreError(
          "Unversioned database already contains tables",
        );
      database.exec(`
        CREATE TABLE workspace (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          revision INTEGER NOT NULL CHECK (revision >= 0),
          snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json))
        ) STRICT;
        CREATE TABLE workspace_events (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          revision INTEGER NOT NULL UNIQUE CHECK (revision >= 0),
          event_json TEXT NOT NULL CHECK (json_valid(event_json))
        ) STRICT;
        PRAGMA user_version = 1;
      `);
    }
  });
}

function verifyDatabase(database: DatabaseSync): void {
  const result = database.prepare("PRAGMA quick_check").all();
  if (result.length !== 1 || result[0]?.quick_check !== "ok") {
    throw new CorruptWorkspaceStoreError(
      "Workspace database integrity check failed",
    );
  }
  const rows = database.prepare("SELECT id FROM workspace").all();
  if (rows.length > 1 || rows.some((row) => row.id !== 1)) {
    throw new CorruptWorkspaceStoreError(
      "Workspace database must contain only the active workspace",
    );
  }
}

function readRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new CorruptWorkspaceStoreError("Invalid workspace revision");
  }
  return value;
}

function readPositiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new CorruptWorkspaceStoreError(`Invalid ${label}`);
  }
  return value;
}

function parseStoredJson<Value>(
  value: unknown,
  parse: (value: unknown) => Value,
  label: string,
): Value {
  try {
    if (typeof value !== "string") throw new Error("Expected stored JSON text");
    const decoded: unknown = JSON.parse(value);
    return parse(decoded);
  } catch (cause) {
    throw new CorruptWorkspaceStoreError(`Cannot read ${label}`, { cause });
  }
}

function serialize<Value>(
  value: Value,
  parse: (value: unknown) => Value,
  label: string,
): { json: string; value: Value } {
  const json = JSON.stringify(value);
  if (json === undefined)
    throw new Error(`Workspace ${label} must be JSON serializable`);
  const decoded: unknown = JSON.parse(json);
  return { json, value: parse(decoded) };
}
