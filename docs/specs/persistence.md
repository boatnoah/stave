# Workspace persistence

The main process owns one active workspace in a local SQLite file. The snapshot
includes the project, team, tickets, runs, events, and its monotonically increasing
revision. `@stave/db` stores that snapshot without taking a dependency on its domain
shape; the application supplies parsers for snapshots and event payloads. No
renderer receives a database handle or filesystem path.

`openWorkspaceStore({ path, parseSnapshot, parseEvent })` opens the file and applies
schema migrations before returning a store. `load()` returns the parsed snapshot or
`null` for a new database. The main process initializes an empty database by saving
revision `0` with `expectedRevision: null` and a `workspace.created` event.

Each `save({ snapshot, event, expectedRevision })` must advance the saved revision by
exactly one. It uses a SQLite immediate transaction to compare the current revision,
replace the snapshot, and append the event. A stale caller receives
`StaleWorkspaceRevisionError`; neither its snapshot nor its event is saved. A failed
event append also rolls back the snapshot write. Application code publishes a new
snapshot only after the save succeeds.

`readEvents()` returns the append-only event history in sequence order, including
each event's workspace revision. Every persisted revision has exactly one event.
Payloads must survive JSON serialization and pass the supplied parsers. The store
validates the serialized payload before writing and parses stored JSON when read.

Schema version `1` contains `workspace` and `workspace_events`, tracked with
`PRAGMA user_version`. The migration from version `0` creates those tables only in
an empty database. The store refuses future schemas, failed integrity checks,
invalid payloads, and histories inconsistent with the snapshot. It does not replace
or silently reset damaged data. New migrations must preserve previous snapshots
and event history in a transaction.

SQLite runs with write-ahead logging and full synchronization. The store uses
`node:sqlite`, bundled by the repository's Node 26 and Electron 43 runtimes, so
packaging does not require a separate native database addon. Call `close()` when
the application exits; repeated close calls are safe.

Recovery belongs to the application layer. On reopen, the application must convert
interrupted in-progress runs to a recoverable state and persist that transition
before publishing it. The database layer never resumes an external process or
changes a run outcome itself.

## Desktop recovery

The desktop stores `stave.sqlite` in its Electron user-data directory. `STAVE_DATA_DIR` overrides the location for isolated development and verification. The app takes a single-instance lock for that data directory.

Every mutation saves the snapshot and a compact journal entry before publishing to the renderer. A failed save leaves the prior in-memory state intact. A write failure during an asynchronous run closes the application with a diagnostic; reopening reconciles the last durable running attempt as Interrupted. Startup never silently replaces corrupt or newer-format data, and recovery never automatically dispatches an agent.

Projects, agent identity, tickets, run attempts, output, and activity survive restart. The UI retains the latest 500 activity entries and 100,000 output characters per ticket; the journal records every saved revision. Explicit quit cancels and saves active work before closing the database.
