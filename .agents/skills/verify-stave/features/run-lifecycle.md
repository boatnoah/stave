# Run lifecycle and decisions

The board can run a simulation without editing repository files. With a repository configured, **Run Codex** executes in the ticket's local worktree. Codex can ask a structured question in the ticket chat; an answer resumes that turn.

## User path

Expand **To do**, create a ticket, and select **Run simulation**. Cancel an active run or let implementation, review, and QA complete. For a Codex run, open the ticket thread in Chat and answer a pending question.

## Live verification

Run `verify.mjs drive-workflow` in a fresh isolated profile. It cancels and restarts a simulation, verifies the engineer, tech lead, and QA handoffs, then checks the Done ticket and chat activity.

To verify a structured decision, use a disposable committed repository containing a file named `scenario` with the text `decision`. Put a temporary executable named `codex` first on `PATH`; it must `exec node /absolute/path/to/packages/agent-runtime/tests/fixtures/codex-server.mjs "$@"`. Launch Stave with that `PATH` and `STAVE_DATA_DIR` isolated, set `VERIFY_REPOSITORY` to the fixture repository, and run `verify.mjs drive-decision`. This exercises the real renderer and runtime boundary against the bundled fake app-server. Do not run this driver without the fixture shim because the app otherwise invokes the installed Codex CLI.

## Notes

- Simulation is local and makes no repository changes.
- Successful QA moves a ticket to Done. Canceling a run leaves it at its current stage.
- The decision proof covers one user-input question and the resumed turn. It does not exercise every Codex runtime failure mode.
