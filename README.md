# Stave

Stave is a local-first delivery board where role-based coding agents turn a sprint goal into a verified product increment. The working title and visual identity are still provisional.

The first vertical slice is intentionally small: a secure Electron shell and a procedural avatar system that makes agent state legible without adding more badges or status chrome to the board.

## Repository

```text
apps/desktop/          Electron main, preload, and React renderer
packages/avatar/       Browser-safe procedural SVG avatar system
assets/design/board/   Product mockups and visual references
assets/avatars/        Editable sources, references, and local exports
docs/architecture/     Architectural boundaries and decisions
```

Future orchestrator, provider, and persistence packages will be added only when their first vertical slice is implemented.

## Development

Requirements: Node.js 22 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Run all checks with:

```bash
pnpm check
```

## Avatar principles

- An agent keeps the same identity for a persisted seed and appearance version.
- Motion communicates real execution state; it is never decorative noise.
- Small board avatars stay restrained. Larger inspector avatars can be more expressive.
- Reduced-motion users receive the same information through static expressions and text.
- The runtime is original procedural SVG. Inspiration images are references, not shipped assets.
