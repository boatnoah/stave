# Avatar state preview

The state picker lets a user preview one execution state across the full crew and compact board avatars.

## Sub-features

- Live mixed states.
- Idle, queued, working, reviewing, waiting, blocked, done, and failed previews.
- Matching visible labels and avatar accessibility labels.
- Reduced-motion presentation controlled by the operating-system preference.

## How to get to it (user POV)

Launch Stave. The avatar study opens as the primary view. The state picker appears below the introduction and begins with `Live mix`.

## Driving it with CDP

Run `verify.mjs drive-state-preview`. It finds the visible `Blocked` button by text, activates it, then reads every `.state-label` and non-decorative avatar `aria-label`. A passing run observes all ten cards in the blocked state.

For another state, reuse the same visible-text lookup and assert both the card labels and avatar accessibility labels.

## Gotchas

- The small board avatars are decorative, so they intentionally have no avatar `aria-label`.
- Animation timing is not proof of state. Assert semantic labels and capture the rendered result.
- `Live mix` restores each agent's assigned demo state rather than one shared value.
