# Agent guide

Stave is a local-first Electron desktop app: a delivery board where role-based coding agents (engineer, tech lead, QA) move tickets from Todo to Done. Real runs use the local `codex` CLI inside an isolated Git worktree per ticket.

This file is the source of truth for every coding agent (Codex, Claude Code, Cursor, Copilot). Package folders may add their own `AGENTS.md` with local rules; the closest file wins.

## Commands

Run everything from the repository root. Node 24+ and pnpm 11.

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Everything CI runs | `pnpm verify` |
| Format and safe lint fixes | `pnpm lint:fix` |
| Typecheck all packages | `pnpm typecheck` |
| Test all packages | `pnpm test` |
| One package | `pnpm --filter @stave/<name> test` |
| One test file | `pnpm --filter @stave/desktop exec vitest run src/shared/ipc-contract.test.ts` |
| Coverage report | `pnpm test:coverage` (HTML in `coverage/`) |
| Unused files, exports, dependencies | `pnpm knip` |
| Package and run end-to-end tests | `pnpm e2e` (macOS; drives the real app with Playwright) |
| Run the app | `pnpm dev` |

Work is done when `pnpm verify` passes, plus `pnpm e2e` for UI or main-process changes. CI runs both, on Linux and macOS, and `main` only accepts squash-merged PRs whose `CI` check passed.

## Layout

```text
apps/desktop/            Electron app
  src/main.ts            Process bootstrap and wiring
  src/main/application/  StaveApplication service, stage runners, persistence
  src/main/ipc/          IPC registration
  src/preload.ts         The only renderer bridge
  src/shared/            Types and validators shared by main and renderer
  src/renderer/          React UI
packages/domain/         Project, team, and workflow vocabulary (no Node, no Electron)
packages/avatar/         Browser-safe procedural SVG avatars
packages/db/             SQLite workspace store (node:sqlite)
packages/git-workspace/  Per-ticket Git worktrees
packages/agent-runtime/  Codex app-server adapter
docs/specs/              Behaviour specs, one per feature
docs/adr/                Architecture decisions
```

Read the matching `docs/specs/*.md` before changing a feature, and update it in the same PR when behaviour changes.

## Rules

- **Dependency direction.** The renderer imports only `domain`, `avatar`, and `src/shared`. Only the main process may import `db`, `git-workspace`, `agent-runtime`, or Node built-ins. `domain` and `avatar` never import Node or Electron. Biome enforces this through overrides in `biome.json`.
- **IPC is untrusted input.** Every IPC payload and persisted snapshot passes through a parser in `src/shared/ipc-contract.ts`. Add a parser and a test when adding a field or channel. Persisted data must stay readable: give new fields a default for older snapshots.
- **Electron security.** Keep `contextIsolation`, `sandbox`, `nodeIntegration: false`, the navigation guards, and the fuses in `forge.config.ts`.
- **Codex runs stay local.** Never add pushes, PR creation, network access, or approvals to the runtime policy. See `docs/specs/codex-runtime.md`.
- **Avatar identity is a persisted contract.** Never change how an existing appearance version renders; add a new version instead.
- **Tests.** Behaviour changes need tests. Unit tests live next to the code as `*.test.ts`; end-to-end tests live in `apps/desktop/e2e/` as `*.spec.ts`. Coverage has a floor in `vitest.coverage.config.mts`. Prefer real Git repositories, real SQLite, and the fake app-server fixture over mocks.
- **Style.** Biome owns formatting. Do not hand-format or add another formatter. Use `// biome-ignore <rule>: <reason>` only with a real reason.

## Never

- Push to `main`, force-push, or merge a PR with failing checks.
- Edit `pnpm-lock.yaml` by hand. Use `pnpm add` or `pnpm install`.
- Commit `.audit/`, `artifacts/`, `.env*`, or anything under `node_modules/`.
- Kill Electron, Node, or pnpm by process name. Other sessions may be running.
- Point verification at a real user repository.

## Pull requests

- Branch from `main`. Use a conventional PR title such as `feat: …`, `fix: …`, or `ci: …`. It becomes the squash commit and the changelog entry.
- Fill in the PR template, especially **Verification**.
- UI changes need proof from the real app. Use the `verify-stave` skill in `.agents/skills/verify-stave/` and attach the screenshots.
- Record lasting design decisions as a new file in `docs/adr/`.
- Releases are automated; never bump versions or edit `CHANGELOG.md` by hand. See `docs/releasing.md`.
