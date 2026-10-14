# Avatar state preview

The state picker lets a user preview one execution state across the full crew and compact board avatars.

## Sub-features

- Live mixed states.
- Idle, queued, working, reviewing, waiting, blocked, done, and failed previews.
- Matching visible labels and avatar accessibility labels.
- Reduced-motion presentation controlled by the operating-system preference.

## How to get to it (user POV)

In the Board view, open Settings, choose **Avatar lab**, then **Open lab**. The state picker appears below the introduction and begins with `Live mix`.

## Driving it with CDP

Run `verify.mjs drive-state-preview`. It opens the lab through Settings, selects `Blocked`, and verifies all ten `.state-label` values and accessible avatar labels. It then emulates reduced motion, changes to `Done`, confirms state labels still update and avatar animation is disabled, and selects `Live mix` to restore the assigned states.

For another state, reuse the same visible-text lookup and assert both the card labels and avatar accessibility labels.

## Gotchas

- The small board avatars are decorative, so they intentionally have no avatar `aria-label`.
- Animation timing is not proof of state. Assert semantic labels and capture the rendered result.
- `Live mix` restores each agent's assigned demo state rather than one shared value.
