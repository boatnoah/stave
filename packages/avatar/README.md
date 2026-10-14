# `@stave/avatar`

Original procedural SVG agents for Stave.

```tsx
<AgentAvatar
  agentId="arlo"
  name="Arlo"
  avatarSeed="arlo-engineer"
  status="working"
  size={48}
/>
```

`avatarSeed` and `appearanceVersion` define stable appearance. Version 4 is the default. It
builds a shared landmark geometry for the head, hair envelope, ears, eyes, nose, mouth, and
marks, then adds deterministic crown lean, unequal fullness, jaw skew, and chin offset. Eye
recipes vary their actual construction—beads, buttons, almonds, sleepy arcs, tall ovals, hooded
lids, an uneven pair, and wide eyes—while keeping one coherent gaze. A face-colored upper lid
masks each version 4 eye after the pupil is drawn, reducing exposed white without flattening the
eye families into one shape. Existing saved agents can still request `appearanceVersion={1}`,
`appearanceVersion={2}`, or `appearanceVersion={3}`.

`status` affects expression and work motion, never identity. Temperament changes how an agent
rests, while a seeded acting style chooses whether it tends to ponder, mutter, nod, react, or
stay reserved. Working, reviewing, waiting, queued, and blocked states use short acting beats;
done and failed reactions fire only when the status changes and never loop on mount.

Hero portraits are free-standing doodles so the silhouette remains visible. Compact board
avatars retain the paper badge and remove thought marks, tears, sparkles, facial marks, and
secondary movement.

The component defaults to accessible standalone output. Set `decorative` when adjacent text
already identifies the agent and state, or `motion="off"` for a fully static rendering.

## Principles

- An agent keeps the same identity for a persisted seed and appearance version.
- Silhouette, features, palette, and temperament carry identity—not hairstyle alone.
- Motion communicates real execution state; it is never decorative noise.
- Small board avatars stay restrained. Larger inspector avatars can be more expressive.
- Reduced-motion users receive the same information through static expressions and text.
- The runtime is original procedural SVG. Inspiration images are references, not shipped assets.
