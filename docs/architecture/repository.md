# Repository architecture

## Current boundaries

### `apps/desktop`

The desktop product owns the Electron lifecycle and the board UI. Its renderer cannot access Node.js directly. A narrow preload bridge will expose typed product capabilities as they are implemented.

### `packages/avatar`

The avatar package has no Electron dependency. It owns deterministic identity generation, SVG character parts, state-driven expressions, and motion. Keeping it browser-safe makes it easy to test and reuse in future web views.

### `packages/domain`

The domain package owns project, agent, team-template, ticket-workflow, and run-state vocabulary. It has no Electron or Node.js dependency. The default software-delivery template creates Maya, Alex, and Sam when a project starts, while the project factory also accepts other versioned templates.

### `packages/agent-runtime`

The agent runtime runs one task through the local `codex app-server` process. It has no Electron dependency and owns the protocol, sandbox policy, cancellation, and result classification. See [the Codex runtime spec](../specs/codex-runtime.md).

### `packages/db`

The database package owns the SQLite workspace store and its journal.

### `packages/git-workspace`

The Git workspace package creates and reuses one isolated worktree per ticket.

### `assets`

`assets/design/board` contains our own product mockups. `assets/avatars/references` contains provenance notes for outside inspiration. `assets/avatars/source` is reserved for editable originals if the procedural system later gains authored paths. Generated previews go to `assets/avatars/exports` and are ignored by default.

## Dependency direction

```text
desktop renderer -> domain + avatar
desktop main -> domain + agent-runtime + db + git-workspace
```

The desktop main process chooses a stage runner per ticket. Simulation tickets use an in-process timer. Codex tickets get an isolated workspace before their first stage, and each stage runs Codex inside that workspace with a stage-specific prompt. A ticket keeps the mode its first run used.
