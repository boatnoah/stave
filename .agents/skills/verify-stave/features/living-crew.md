# Living crew

The living crew grid presents distinct procedural identities and communicates each agent's current role, state, and activity.

## Sub-features

- Deterministic identity from an avatar seed.
- Visible name and role.
- Visible execution-state label.
- Visible activity description.
- Accessible non-decorative avatar label.

## How to get to it (user POV)

In the Board view, open Settings, choose **Avatar lab**, then **Open lab**. Scroll below the state picker to the agent grid under the `Living crew` eyebrow.

## Driving it with CDP

Run `verify.mjs drive-avatar-study`. It records each `.agent-study` heading, role, state, activity, and `.agent-avatar` accessibility label, and asserts that all ten names are distinct and all fields are present.

Capture a full-page screenshot and the extracted identity table in the evidence directory.

## Gotchas

- Procedural SVG geometry is tested separately in `packages/avatar`; this feature verifies integration and user-visible identity.
- Do not compare generated SVG paths byte-for-byte in the desktop proof.
- Motion may be disabled by `prefers-reduced-motion`; identity and state must remain visible without it.
