# Git ticket workspaces

`@stave/git-workspace` creates one isolated Git worktree per repository and ticket. The desktop main process calls `createOrReuseWorkspace({ repositoryPath, workspaceRoot, ticketId })` and receives `{ path, branch, dirty }`. It requires Git on the system path and a source repository with at least one commit.

Both input paths must be absolute. The source path must identify the root of a working tree; its real path and shared Git directory are verified. The workspace root is canonicalized and must sit outside the source repository. A symbolic link at the workspace root itself is refused. Existing parent aliases, including operating-system temporary-directory aliases, resolve to their canonical directory before any workspace is created.

The directory name combines a sanitized ticket slug with a 20-character SHA-256 suffix over the shared Git directory and exact ticket id. The branch is `stave/ticket/<directory-name>`. Tickets that have the same slug remain separate, and linked source worktrees for the same repository identify the same ticket branch. New branches start at the supplied source worktree's current `HEAD`. If the ticket branch exists but is not checked out, it is attached without resetting its history.

Reuse requires the expected path and branch in Git's registered worktree list, a real directory within the canonical root, and the expected shared Git directory. Existing unregistered paths, symbolic links, changed branches, and branches checked out elsewhere cause an error. Git commands use argument arrays, disable checkout hooks and filesystem-monitor hooks, and do not inherit Git environment overrides.

`dirty` reports staged, unstaged, or untracked work through Git status. Ignored files do not count as dirty. Reuse preserves all work. This package never resets, cleans, removes, prunes, or automatically repairs a workspace. If a Git operation is interrupted, the next call either reuses a verified workspace or reports a conflict for the user to inspect. The workspace root must be controlled by the application user; filesystem checks cannot prevent another process with write access from replacing directories during a Git operation.

`GitWorkspaceError.code` distinguishes `invalid-input`, `invalid-repository`, `unsafe-path`, `workspace-conflict`, and `git-failed`. The original failure is retained as the error cause where applicable.

The package tests use real temporary Git repositories. They cover creation, dirty reuse, invalid repositories, hostile ticket text, slug collisions, path and symlink conflicts, changed branches, a ticket branch checked out elsewhere, and resuming a branch without losing its commits.
