# UI redesign

Stave's desktop UI is a dark working tool with two main areas: a Jira-style ticket board and a Slack-style team chat. This specification records the October 2026 design decisions and the delivery sequence.

The private design exports are `Stave Boot Screen.html` and `Stave Team Chat.html`. The board reference is the Workbench preset at Airy density. The chat reference is the Slack window without tinted surfaces.

## Principles

- The board is home. Stave opens on the board. Chat is one tab away and never opens as a modal.
- Each element carries its content and one state. Metadata stays in fixed positions or appears on hover.
- Surfaces use warm greys. Color appears as text, small dots, and thin borders. Cards, mentions, buttons, and progress bars do not use colored background washes.
- Amber means "needs you." Only work waiting on the user uses amber.
- Machine text uses the code font. Ticket keys, branches, run output, diffs, and timestamps are machine text.

## Color tokens

The interface is dark-first. A later light theme must reuse the same token names.

| Token | Value | Use |
| --- | --- | --- |
| `--ink-0` | `#14120b` | App background |
| `--ink-1` | `#1a1812` | Sidebars and column panels |
| `--ink-2` | `#221f18` | Cards, hover, and selected rows |
| `--ink-3` | `#2b2820` | Inputs, tracks, and pressed controls |
| `--line` | `#edecec` at 8% | Hairlines |
| `--line-strong` | `#edecec` at 16% | Card and control borders |
| `--text` | `#edecec` | Primary text |
| `--text-2` | `#edecec` at 62% | Secondary text |
| `--text-3` | `#edecec` at 40% | Tertiary text and timestamps |
| `--accent` | `#8fb8e8` | Links, ticket keys, and focus rings |
| `--waiting` | `#e3b660` | Work waiting on the user |
| `--failed` | `#e07a8b` | Failed work or usage limits |
| `--done` | `#6fbf8e` | Verified work |
| `--review` | `#c0a8dd` | Review stage |
| `--qa` | `#9fc9a2` | QA stage |

Do not use Cursor orange (`#f54e00`) or a similar orange.

Agent colors remain Maya `#d9a77f`, Alex `#a9c1de`, and Sam `#b9d6a8`. Procedural avatars use a light disc in the agent color because their ink lines are dark.

## Typography

Bundle both font families with the app. The renderer must not load fonts from the network.

| Role | Family | Weights |
| --- | --- | --- |
| UI and chat | Lato | 400, 700, 900 |
| Code | Red Hat Mono | 400, 500 |

Use these text styles:

| Style | Size and line height | Weight |
| --- | --- | --- |
| Channel and page title | 17 / 1.3 | 900 |
| Card title | 14.5 / 1.4 | 400 |
| Message body | 14 to 15 / 1.47 | 400 |
| Message name | 15 | 700 |
| Metadata | 12 to 12.5 / 1.4 | 400 |
| Column header | 13 | 700 |
| Machine text | 11 to 12.5 / 1.6 | 400 |
| Eyebrow label | 11, uppercase, 0.04em tracking | 700 |

## Spacing and shape

Use the 4-pixel spacing grid: 4, 8, 12, 16, 24, 32, and 48 pixels. Use `gap` to lay out siblings.

| Element | Value |
| --- | --- |
| Card radius | 8px |
| Column radius | 10px |
| Window radius | 12px |
| Board chip and avatar | Fully round |
| Chat avatar | Rounded square with 22% radius |
| Input and button radius | 6 to 8px |

Surface steps and hairlines create depth. Do not use shadows.

## App shell

The title bar contains the traffic lights, Board and Chat tabs, an outlined `N need you` button with an amber dot, and a Command-K hint. The needs-you button opens the needs-you list.

Command-K opens a command menu that can jump to any ticket, channel, or agent. It can also create a ticket, start work, and cancel a run.

Remove the landing-page header, hero copy, team cards on the home screen, and page-wide activity list. Move the project name and repository controls into a settings sheet.

## Ticket board

The board uses Focus lanes at Airy density.

The columns are To do, Building, Review, QA, and Done. Building, Review, and QA use `--ink-1` panels. To do and Done default to 52-pixel rails with a vertical count. A rail expands when clicked. The expanded header folds it again.

Use these Airy dimensions:

- Full column width: 288px.
- Column gap: 18px.
- Panel padding: 10px.
- Card gap: 14px.
- Card padding: 15px.
- Card inner gap: 12px.
- Card title: 14.5px.

Each working-column header shows the name, a mono count, and `n/limit`. The limit turns amber when reached. The defaults are Building 2, Review 1, and QA 2. A thin stage-colored bar below the header shows progress.

Classic cards use fixed anatomy:

1. The title occupies up to three lines.
2. An optional tag row contains one state flag, followed by the epic. Waiting-on-user uses amber text. A usage-limit pause uses rose text.
3. The footer puts the type icon and ticket key on the left. Points, priority, and the avatar sit on the right.
4. A live strip appears only while an agent runs. It contains activity text and a thin progress bar.

Waiting cards use an amber border. Failed cards use a rose border. Their backgrounds remain neutral.

A board setting can show a needs-you swimlane above the board. The setting defaults to off.

Clicking a card opens a right inspector while the board remains visible. The inspector shows the key and branch in mono, title, stage timeline, diff size, live output, and the Open in chat, View diff, and Cancel run controls.

## Team chat

Chat uses Lato. The earlier Recursive agent voice is not part of the product.

The sidebar sections appear in this order:

1. Needs you lists waiting tickets with their key, short title, amber dot, and count.
2. Channels lists `#team`, `#releases`, and one channel per cycle.
3. Ticket threads lists active tickets with a key, short title, and stage-colored dot.
4. Direct lists Maya, Alex, and Sam with a presence dot.

The channel header shows the channel name, topic, and member avatars.

Each message has a rounded-square avatar, bold name, role, and timestamp. Consecutive messages from one sender share one header. A hover action bar provides message actions.

`@you` uses amber text. Other mentions use accent text. Mentions do not use a background. Inline ticket keys use accent text and open the ticket.

Attachments use neutral surfaces and a hairline border:

- A handoff shows the from and to avatars, the handoff destination, and the diff size.
- A test result shows the command, duration, and pass or fail lines in mono.

A decision card contains an amber dot and a waiting-on-user label, a bold question, at least two outlined options with one-line tradeoffs, and a note that the user can reply. Answering resumes the run.

A system line is one quiet line with a stage-colored dot.

The thread pane pins a ticket summary above the replies. The summary contains the key, stage, owner, title, and a three-segment grayscale stage bar. Done segments are light, the current segment is white, and future segments are dim.

The composer contains the channel placeholder, chips for mentions, `/run`, `/ticket`, and ticket keys, plus an outlined Send button. A typing indicator appears above it. Supported slash commands are `/run`, `/ticket`, `/assign`, and `/cancel`.

## Accessibility and motion

- Every control has an accent focus ring.
- The board and chat support full keyboard navigation. J and K move between cards, C creates a ticket, Enter opens the selected card, and Command-K opens the command menu.
- Motion reports real work only: a live pulse, typing dots, and progress.
- `prefers-reduced-motion` stops all motion.
- State is never color alone. Every state dot has a nearby text label.

## Data and runtime work

Tickets gain a per-project sequential key, type, priority, points, epic, and optional labels. The domain, snapshot, IPC parsers, and SQLite store own these fields. Older snapshots receive defaults.

The board stores per-column WIP limits.

Chat stores channels, ticket threads, direct conversations, and messages from agents, the user, and the system. Agents can post messages and handoffs.

A `waiting_user` run contains a structured question and options. The runtime can resume the same run with the user's answer.

Run events expose step text and a progress fraction for live ticket strips and stage bars.

## Delivery sequence

Each item ships as one pull request. `pnpm verify`, `pnpm e2e`, and real-app verification must pass for each item.

1. Add the color and spacing tokens, bundle Lato and Red Hat Mono, and remove the cream theme without changing layout.
2. Add the title bar, Board and Chat tabs, needs-you control, command menu, and settings sheet. Remove the landing-page layout.
3. Add Focus lanes, Classic cards on current data, rails, WIP limits, and the ticket inspector.
4. Add ticket key, type, priority, points, epic, and labels through the domain and persistence boundaries.
5. Add read-only chat from existing activity and run events.
6. Add user messages, mentions, slash commands, and thread replies.
7. Add structured decisions and run resume.
8. Add the final logo and app icon after a logo direction is selected.

## Current defaults

- Use Glacier (`#8fb8e8`) for the accent.
- Use Red Hat Mono beside Lato.
- Use Classic cards.
- Keep the needs-you swimlane off by default.
- Do not ship a final logo or app icon until a direction is selected.
