# Living crew

The living crew grid presents distinct procedural identities and communicates each agent's current role, state, and activity.

## Sub-features

- Deterministic identity from an avatar seed.
- Visible name and role.
- Visible execution-state label.
- Visible activity description.
- Accessible non-decorative avatar label.

## How to get to it (user POV)

Launch Stave and remain on the opening avatar study. Scroll below the state picker to the grid headed by the `Living crew` eyebrow.

## Driving it with CDP

Query `.agent-study` elements from the real renderer. For each card, record its heading, role, state label, activity, and the `.agent-avatar` accessibility label. Prove that every card has all five values and that agent names are distinct.

Capture a full-page screenshot and the extracted identity table in the evidence directory.

## Gotchas

- Procedural SVG geometry is tested separately in `packages/avatar`; this feature verifies integration and user-visible identity.
- Do not compare generated SVG paths byte-for-byte in the desktop proof.
- Motion may be disabled by `prefers-reduced-motion`; identity and state must remain visible without it.
