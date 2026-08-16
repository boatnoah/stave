# `@stave/avatar`

Original procedural SVG agents for Stave.

```tsx
<AgentAvatar
  agentId="arlo"
  name="Arlo"
  avatarSeed="arlo-engineer-v1"
  status="working"
  size={48}
/>
```

`avatarSeed` and `appearanceVersion` define stable appearance. `status` affects expression and motion, never identity. The component defaults to accessible standalone output; set `decorative` when adjacent text already identifies the agent and state.
