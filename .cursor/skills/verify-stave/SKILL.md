---
name: verify-stave
description: Drive the real Stave Electron desktop app through Chrome DevTools Protocol and capture proof when changing its renderer, Electron shell, avatar states, or board presentation.
---

# Verify Stave

Use this skill to prove behavior in the real Electron app. Run `pnpm check` first for static and unit coverage, then exercise the affected user path here.

## Launch

From the repository root, choose an unused port and an isolated state directory:

```bash
VERIFY_PORT=9333
VERIFY_STATE="/tmp/stave-verify-$VERIFY_PORT"
.cursor/skills/verify-stave/scripts/launch.sh "$VERIFY_PORT" "$VERIFY_STATE"
```

The helper runs the documented Electron Forge development entry point with a dedicated Chromium profile and remote-debugging port. It is ready when the helper prints `Stave verification instance ready`. Keep that terminal or execution session open while driving the app. Logs and exact process IDs are stored under `$VERIFY_STATE`.

Run only one driver against a given port. Parallel instances are safe when they use different ports and state directories.

Teardown:

```bash
.cursor/skills/verify-stave/scripts/cleanup.sh "$VERIFY_PORT" "$VERIFY_STATE"
```

## Doctor

Before driving the app, confirm that the expected Stave renderer owns the chosen endpoint:

```bash
node .cursor/skills/verify-stave/scripts/verify.mjs doctor "$VERIFY_PORT"
```

The doctor fails unless CDP exposes a page titled `Stave` with the current avatar-study surface and its state-preview controls. A failed doctor means the instance is not worth driving. Inspect `$VERIFY_STATE/launcher.log`, clean up that instance, and launch again.

## Drive

Drive the current state-preview feature through stable visible labels:

```bash
VERIFY_RUN="$(date -u +%Y%m%dT%H%M%SZ)"
VERIFY_EVIDENCE="artifacts/verification/stave/$VERIFY_RUN"
node .cursor/skills/verify-stave/scripts/verify.mjs drive-state-preview "$VERIFY_PORT" "$VERIFY_EVIDENCE"
```

The driver connects to the real Electron renderer, captures the initial screen, clicks the visible `Blocked` control, verifies every agent card reports `Blocked`, and captures the resulting screen. It does not call React internals or test-only setters.

Use the same CDP recipe for other mapped features. Prefer accessible labels, visible button text, and semantic headings. Do not use screen coordinates or tab counts.

## Evidence

Proof is written beneath `artifacts/verification/stave/<run-id>/`:

- `before.png` captures the state before the action.
- `after.png` captures the resulting user-visible state.
- `result.json` records the action, observed labels, page URL, and assertion outcome.

A valid proof exercises the real user path and captures both the action boundary and resulting state. For features with durable side effects, also inspect the resulting file, database row, Git ref, or message. Do not substitute an internal setter or a mocked UI for the real Electron renderer. External systems may be faked only behind an existing production boundary.

The current avatar preview has no durable side effect. Its proof is the visible state change plus the observed accessibility labels.

## Cleanup

Always clean up the exact instance you launched:

```bash
.cursor/skills/verify-stave/scripts/cleanup.sh "$VERIFY_PORT" "$VERIFY_STATE"
```

The helper only terminates PIDs recorded by `launch.sh` and verifies the Electron PID still owns the selected port before signaling it. It removes the isolated profile and logs. It never removes `artifacts/verification`, so evidence survives teardown.

Never kill Electron, Node, pnpm, or Forge by process name. Other development sessions may be active.

## Helpers

- `scripts/launch.sh <port> <state-dir>` starts one isolated Electron verification instance, waits for CDP readiness, and remains attached until cleanup.
- `scripts/verify.mjs doctor <port>` checks that the correct app and controls are available.
- `scripts/verify.mjs drive-state-preview <port> <evidence-dir>` drives one mapped feature and captures proof.
- `scripts/cleanup.sh <port> <state-dir>` terminates only the recorded instance and removes its scratch state.

The shell helpers are executable. Run all commands from the repository root.
