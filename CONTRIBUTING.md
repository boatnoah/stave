# Contributing

Setup, commands, layout, and rules live in [AGENTS.md](AGENTS.md). They apply to people and agents alike.

1. Branch from `main`.
2. Make the change with tests, and update the matching spec in `docs/specs/`.
3. Run `pnpm verify`. A pre-commit hook formats staged files automatically.
4. Open a PR with a conventional title and fill in the template.

PRs merge by squash once the `CI` check passes. Copilot reviews every PR automatically.
