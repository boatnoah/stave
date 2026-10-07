# agent-runtime

Spec: `docs/specs/codex-runtime.md`. Keep it in sync with any behaviour change.

- No Electron or desktop imports. The only entry point is `runCodex`.
- The sandbox policy is a security boundary. Do not loosen workspace-write, network, approval denial, or the disabled feature list without an ADR.
- Every result path must clean up the child process group. Add a subprocess test for any new exit path.
- Only events for the created thread and turn may change the result.
- Tests use `tests/fixtures/codex-server.mjs`, a scripted fake app-server. Extend the fixture instead of mocking `spawn`.
