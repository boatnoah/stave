# Board-size task cards

The compact board study inside Avatar Lab proves avatars and execution state remain legible in ticket-card constraints. It is separate from the persisted delivery board.

## Sub-features

- Ticket identifier and priority.
- Ticket title.
- Assigned agent name and compact avatar.
- Current execution-state label.
- Responsive one-, two-, and four-column layouts.

## How to get to it (user POV)

In the Board view, open Settings, choose **Avatar lab**, then **Open lab**. Scroll to `Quiet at 28 pixels`. Four task cards appear beneath that heading.

## Driving it with CDP

Run `verify.mjs drive-avatar-study`. It asserts four cards, two metadata values per card, a title, assigned agent name, decorative avatar, and state label; it also checks the four-, two-, and one-column layouts at 1280, 800, and 500 pixels and captures each view.

## Gotchas

- Compact avatars are decorative because the adjacent agent name carries the accessible identity.
- The current cards are design-study data, not persisted tickets.
- Do not treat the current four-column study as the final Kanban information architecture.
