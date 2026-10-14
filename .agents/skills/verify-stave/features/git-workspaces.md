# Git workspaces

With a local repository configured, a ticket can prepare its isolated Git worktree. Refreshing the workspace keeps its ticket branch and unfinished changes.

## User path

Open a ticket's details, choose **Prepare workspace**, add an uncommitted file in that worktree, then choose **Refresh workspace**.

## Live verification

Create a disposable committed Git repository and run the app with a fresh data directory. Set `VERIFY_REPOSITORY` to the fixture path and run `verify.mjs drive-git`. The helper prepares a workspace, writes a verification file into the reported path, refreshes it, and checks that path, branch, dirty status, and file contents remain. Inspect `result.json`, `workspace.png`, and the worktree before cleaning up the isolated app state.

Never point this proof at a real user repository.
