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

`avatarSeed` and `appearanceVersion` define stable appearance. Version 2 is the default and
varies silhouette, hair, facial geometry, warm palette, marks, and temperament through
independent seeded channels. Existing saved agents can request `appearanceVersion={1}`.

`status` affects expression and work motion, never identity. Temperament changes how an agent
rests and reacts without changing the meaning of a status. Terminal reactions fire only when
the status changes; they do not loop on mount.

The component defaults to accessible standalone output. Set `decorative` when adjacent text
already identifies the agent and state, or `motion="off"` for a fully static rendering.
