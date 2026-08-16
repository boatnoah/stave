# Repository architecture

## Current boundaries

### `apps/desktop`

The desktop product owns the Electron lifecycle and the board UI. Its renderer cannot access Node.js directly. A narrow preload bridge will expose typed product capabilities as they are implemented.

### `packages/avatar`

The avatar package has no Electron dependency. It owns deterministic identity generation, SVG character parts, state-driven expressions, and motion. Keeping it browser-safe makes it easy to test and reuse in future web views.

### `assets`

`assets/design/board` contains our own product mockups. `assets/avatars/references` contains provenance notes for outside inspiration. `assets/avatars/source` is reserved for editable originals if the procedural system later gains authored paths. Generated previews go to `assets/avatars/exports` and are ignored by default.

## Planned boundaries

The following packages are expected, but should not be created until a working slice needs them:

- `domain`: Project, Sprint, Task, Agent, and Run state machines.
- `agent-runtime`: the provider contract and Codex app-server adapter.
- `db`: SQLite schema, migrations, and repositories.

This avoids empty architecture while preserving clear dependency direction:

```text
desktop renderer -> avatar
desktop main -> domain -> agent-runtime
                    |          |
                    +---- db --+
```
