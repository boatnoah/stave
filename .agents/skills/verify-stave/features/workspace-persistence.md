# Workspace persistence

Stave stores the project, tickets, messages, activity, and run history in its local workspace database. A fresh app instance restores that saved state.

## Live verification

Set `STAVE_DATA_DIR` to a disposable directory separate from the launch state directory. Run `verify.mjs drive-workflow`, clean up that app instance, then launch a fresh profile with the same `STAVE_DATA_DIR`. After `doctor`, run `verify.mjs verify-restored`. It checks the project, both tickets, completed stage, run history, Board and Chat tabs, and captures `restored.png`.

The live proof covers normal saved-state restoration. Recovery of interrupted Codex work is covered by the application persistence tests, not this UI driver.

## Notes

- The data directory is distinct from the launch helper's disposable profile and logs.
- Keep the data directory until the restore drive finishes, then remove the disposable directory.
