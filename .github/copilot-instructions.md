Follow the repository rules in `AGENTS.md` at the root and any `AGENTS.md` in the package being changed.

When reviewing pull requests, focus on:
- Correctness and missing tests for changed behaviour.
- Dependency direction: the renderer must not import Node, `db`, `git-workspace`, or `agent-runtime`.
- IPC and persisted data validation in `apps/desktop/src/shared/ipc-contract.ts`, including compatibility with older saved snapshots.
- Electron security settings and the Codex runtime sandbox policy, which must not be loosened.
- Avatar appearance versions, which must render identically once released.

Skip formatting and style comments; Biome enforces them in CI.
