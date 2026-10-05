# Repository architecture

## Current boundaries

### `apps/desktop`

The desktop product owns the Electron lifecycle and the board UI. Its renderer cannot access Node.js directly. A narrow preload bridge will expose typed product capabilities as they are implemented.

### `packages/avatar`

The avatar package has no Electron dependency. It owns deterministic identity generation, SVG character parts, state-driven expressions, and motion. Keeping it browser-safe makes it easy to test and reuse in future web views.

### `packages/domain`

The domain package owns project, agent, team-template, ticket-workflow, and run-state vocabulary. It has no Electron or Node.js dependency. The default software-delivery template creates Maya, Alex, and Sam when a project starts, while the project factory also accepts other versioned templates.

### `assets`

`assets/design/board` contains our own product mockups. `assets/avatars/references` contains provenance notes for outside inspiration. `assets/avatars/source` is reserved for editable originals if the procedural system later gains authored paths. Generated previews go to `assets/avatars/exports` and are ignored by default.

## Planned boundaries

The following packages are expected, but should not be created until a working slice needs them:

- `agent-runtime`: the provider contract and Codex app-server adapter.
- `db`: SQLite schema, migrations, and repositories.
- `git-workspace`: safe Git worktree lifecycle management.

This avoids empty architecture while preserving clear dependency direction:

```text
desktop renderer -> domain + avatar
desktop main -> domain + agent-runtime + db + git-workspace
agent-runtime + db + git-workspace -> domain
```
