# Team chat

Chat shows workspace activity and supports team messages, ticket threads, and agent conversations.

## User path

Choose **Chat** in the title bar. The team channel opens first. Send a message, select a ticket from chat, and reply in its thread.

## Live verification

Run `verify.mjs drive-workflow` in a fresh isolated profile. The helper checks that the team channel contains project and run activity, sends a message with `@you`, creates a ticket with the `/ticket` command, opens a ticket thread, and sends a reply. It captures team and ticket-thread screenshots.

## Notes

- The helper proves team-channel messaging and a ticket thread. It does not claim coverage of direct agent conversations, `#releases`, or every slash command.
- Messages are retained in the local workspace.
