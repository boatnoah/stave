---
name: verify-stave
description: Drive the real Stave Electron desktop app through Chrome DevTools Protocol and capture proof when changing its renderer, Electron shell, avatar states, or board presentation.
---

# Verify Stave

Use this skill to prove behavior in the real Electron app. Run `pnpm check` first, then exercise the affected user paths here. The [feature map](features/README.md) lists the current user-facing surfaces.

## Launch

From the repository root, choose an unused port and an isolated state directory:

```bash
VERIFY_PORT=9333
VERIFY_STATE="/tmp/stave-verify-$VERIFY_PORT"
.agents/skills/verify-stave/scripts/launch.sh "$VERIFY_PORT" "$VERIFY_STATE"
```

The helper runs the Electron Forge development entry point with a dedicated Chromium profile and remote-debugging port. It is ready when it prints `Stave verification instance ready`. Keep that execution session open while driving the app. Logs and exact process IDs are stored under `$VERIFY_STATE`.

The launch state directory contains the temporary profile, logs, and default `STAVE_DATA_DIR`. Set `STAVE_DATA_DIR` to a separate disposable directory when data must survive cleanup and relaunch. Run one driver at a time against a port. Parallel instances are safe when they use different ports and state directories.

## Doctor

Before the first drive on an instance, confirm the expected Stave renderer owns the chosen endpoint:

```bash
node .agents/skills/verify-stave/scripts/verify.mjs doctor "$VERIFY_PORT"
```

The doctor checks for a page titled `Stave` with the workspace or avatar lab. After a failed drive, run the doctor again. If it fails, inspect `$VERIFY_STATE/launcher.log`, clean that instance, and launch a new one.

The boot-screen driver performs its own page health check because it must run immediately after a fresh launch to observe the conditional opening state.

## Drive

Capture proof beneath `artifacts/verification/stave/<run-id>/`:

```bash
VERIFY_RUN="$(date -u +%Y%m%dT%H%M%SZ)"
VERIFY_EVIDENCE="artifacts/verification/stave/$VERIFY_RUN"
```

The main workspace flow creates a project and ticket through visible forms, sets ticket metadata, cancels a simulated run, completes the three role handoffs, inspects the ticket, and exercises team chat and a ticket thread:

```bash
node .agents/skills/verify-stave/scripts/verify.mjs drive-workflow "$VERIFY_PORT" "$VERIFY_EVIDENCE"
```

To verify saved state after restart, use a data directory separate from the launch state directory. Run `drive-workflow`, clean up that app instance, launch a fresh profile with the same `STAVE_DATA_DIR`, run `doctor`, then run:

```bash
node .agents/skills/verify-stave/scripts/verify.mjs verify-restored "$VERIFY_PORT" "$VERIFY_EVIDENCE-restored"
```

For the Avatar Lab, open Settings → **Avatar lab** → **Open lab**. `drive-avatar-study` records crew identity fields and accessible avatar labels, then checks compact cards at 1280, 800, and 500 pixels. `drive-state-preview` changes all agents to Blocked, checks accessible labels, tests reduced motion, and restores Live mix:

```bash
node .agents/skills/verify-stave/scripts/verify.mjs drive-avatar-study "$VERIFY_PORT" "$VERIFY_EVIDENCE-avatar-study"
node .agents/skills/verify-stave/scripts/verify.mjs drive-state-preview "$VERIFY_PORT" "$VERIFY_EVIDENCE-avatar-state"
```

For a ticket worktree, use a disposable committed repository and a fresh app data directory. Never point the proof at a real user repository:

```bash
VERIFY_REPOSITORY=/path/to/disposable-repository \
  node .agents/skills/verify-stave/scripts/verify.mjs drive-git "$VERIFY_PORT" "$VERIFY_EVIDENCE-git"
```

`drive-git` prepares a ticket worktree, writes an uncommitted proof file, refreshes it, and checks that the same branch, path, dirty state, and file contents remain.

For a structured Codex decision, use a disposable committed repository with a `scenario` file containing `decision`. Launch the app with a temporary executable named `codex` first on `PATH`; make that shim execute the bundled `packages/agent-runtime/tests/fixtures/codex-server.mjs` with the same arguments. Set `VERIFY_REPOSITORY` to the fixture path, then run:

```bash
VERIFY_REPOSITORY=/path/to/disposable-repository \
  node .agents/skills/verify-stave/scripts/verify.mjs drive-decision "$VERIFY_PORT" "$VERIFY_EVIDENCE-decision"
```

Do not run `drive-decision` without the fixture shim. Otherwise, the app can invoke the installed Codex CLI.

For the delayed boot screen, start a fresh isolated app and run this driver immediately. It observes the initial workspace load under CPU throttling. It records `verified-unreachable` with `fast-open.png` if the workspace resolves before the 300 ms display delay:

```bash
node .agents/skills/verify-stave/scripts/verify.mjs drive-boot-screen "$VERIFY_PORT" "$VERIFY_EVIDENCE-boot-screen"
```

Use the same CDP recipe for other mapped features. Prefer accessible labels, visible button text, and semantic headings. Do not use screen coordinates, test-only React setters, or mocked IPC.

## Evidence

- `before.png` and `after.png` capture the state before and after an action when used by a driver.
- `result.json` records the action, observed labels, page URL, and assertion outcome.
- Other images have names tied to the captured state, such as `crew.png`, `workspace.png`, or `restored.png`.

For features with durable side effects, inspect the resulting file, database row, Git ref, or message before cleanup. Check every artifact at its named location after cleanup; do not assume it survived.

## Cleanup

Always clean up the exact instance you launched:

```bash
.agents/skills/verify-stave/scripts/cleanup.sh "$VERIFY_PORT" "$VERIFY_STATE"
```

The helper only terminates PIDs recorded by `launch.sh` and verifies that the Electron PID still owns the selected port before signaling it. It removes the isolated profile and logs. It does not remove `artifacts/verification` or a separately configured `STAVE_DATA_DIR`.

Never kill Electron, Node, pnpm, or Forge by process name. Other development sessions may be active.

## Helpers

- `scripts/launch.sh <port> <state-dir>` starts one isolated Electron verification instance and remains attached until cleanup.
- `scripts/verify.mjs doctor <port>` checks the app endpoint and surface.
- `scripts/verify.mjs drive-avatar-study <port> <evidence-dir>` checks living crew and compact study cards.
- `scripts/verify.mjs drive-state-preview <port> <evidence-dir>` checks shared avatar states and reduced motion.
- `scripts/verify.mjs drive-workflow <port> <evidence-dir>` checks project, ticket, simulation, and team chat.
- `scripts/verify.mjs drive-decision <port> <evidence-dir>` checks a structured Codex decision; requires the fake Codex shim and disposable repository.
- `scripts/verify.mjs drive-git <port> <evidence-dir>` checks worktree preparation and refresh; requires a disposable repository.
- `scripts/verify.mjs verify-restored <port> <evidence-dir>` checks project, tickets, and run history after restart.
- `scripts/verify.mjs drive-boot-screen <port> <evidence-dir>` checks the conditional boot screen during a slow initial load.
- `scripts/cleanup.sh <port> <state-dir>` terminates only the recorded instance and removes its scratch state.

The shell helpers are executable. Run all commands from the repository root.
