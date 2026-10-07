# desktop

- `src/main/application/stave-application.ts` owns all workspace state. The renderer only reads snapshots and sends requests.
- New IPC channel checklist: name in `ipcChannels`, parser in `ipc-contract.ts`, handler in `register-stave-ipc.ts`, preload method, `StaveDesktopApi` type, and tests for the parser.
- Snapshot shape changes must parse older saved snapshots (see the `mode` default in `parseWork`).
- Stage runners (`StageRunner`) are the seam for execution. Simulation and Codex both implement it; tests inject fakes there.
- UI changes need real-app proof via `.agents/skills/verify-stave`.
