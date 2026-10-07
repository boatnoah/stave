# 1. Agent-friendly repository

Date: 2026-10-06

## Context

Most Stave code is written by coding agents (Codex, Claude Code, Cursor). Before this decision, `main` had no checks, there was no formatter, and session notes lived in an untracked `.audit/` folder that the next agent could not see.

## Decision

- `AGENTS.md` is the single instruction file. `CLAUDE.md` and `.github/copilot-instructions.md` point to it, and packages add local `AGENTS.md` files.
- `pnpm verify` is the single definition of done, run identically locally and in CI.
- Biome owns formatting and linting, applied by a lefthook pre-commit hook and a Claude Code edit hook.
- `main` is protected by a ruleset: squash merges through PRs only, the aggregate `CI` check and conventional titles required, Copilot review on every PR, and no bypass actors.
- Shared skills live in `.agents/skills/`, symlinked into `.claude/skills/` and `.cursor/skills/`.
- Lasting decisions are recorded here instead of in untracked notes.

## Consequences

Agents get the same guardrails as people, and failures name the command that reproduces them. The ruleset has no bypass, so emergency fixes also go through a PR unless an admin edits the ruleset.
