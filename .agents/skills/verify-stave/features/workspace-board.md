# Workspace setup and board

Stave opens a local workspace. A user creates a project, adds tickets, moves through the five workflow stages, and opens ticket details from the board.

## User path

On a new workspace, enter a project name and optionally a local repository path, then choose **Create project**. Expand **To do**, choose **Add ticket**, enter ticket details, and create it. Select a ticket title to open its inspector.

## Live verification

Run `verify.mjs drive-workflow`. It creates a project and a ticket through the visible forms, sets type, priority, points, epic, and labels, runs the ticket to Done, and checks its key, metadata, activity, and output in the inspector. The result includes board and inspector screenshots. Use only a fresh isolated profile.

The helper creates an additional ticket from chat as part of the chat proof. `verify.mjs verify-restored` checks both tickets after an app restart; it is documented in [Workspace persistence](workspace-persistence.md).

## Notes

- Projects and repositories stay local.
- The five stages are To do, Building, Review, QA, and Done. To do and Done start collapsed.
- Ticket metadata is set at creation. The current inspector does not edit ticket fields.
