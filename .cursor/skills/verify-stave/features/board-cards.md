# Board-size task cards

The compact board study proves avatars and execution state remain legible in ticket-card constraints.

## Sub-features

- Ticket identifier and priority.
- Ticket title.
- Assigned agent name and compact avatar.
- Current execution-state label.
- Responsive one-, two-, and four-column layouts.

## How to get to it (user POV)

Launch Stave and scroll to `Quiet at 28 pixels`. Four task cards appear beneath that heading.

## Driving it with CDP

Query `.task-card` elements. Assert there are four cards and that each contains two metadata values, a non-empty title, an assigned agent name, one decorative compact avatar, and a state label. Capture the section at desktop width. For responsive work, resize the CDP viewport and capture the same section at the affected width.

## Gotchas

- Compact avatars are decorative because the adjacent agent name carries the accessible identity.
- The current cards are design-study data, not persisted tickets.
- Do not treat the current four-column study as the final Kanban information architecture.
