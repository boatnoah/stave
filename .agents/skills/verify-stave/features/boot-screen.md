# Delayed boot screen

When the workspace snapshot takes longer than 300 ms to load, Stave shows an accessible stacked S mark over the workspace. When loading finishes, the mark fades and shrinks as the board appears. Faster loads skip the overlay.

## Live verification

Launch a fresh isolated app and run `verify.mjs drive-boot-screen` immediately. The driver checks the real Stave page, applies a 20x CPU throttle while observing the initial workspace load, and captures the opening and revealed states if the loading interval exceeds the 300 ms display delay.

The feature is conditional. If the result is `verified-unreachable`, retain `fast-open.png` and record the exact prerequisite: this run's workspace snapshot resolved in under 300 ms despite a fresh profile and CPU throttle. Do not claim the overlay was observed. Retry only when a concrete slow-loading condition is available; do not use React setters or mock IPC to force it.

## Reduced motion

The reduced-motion rule keeps the mark still and gently breathes its center bar. The ordinary live driver may not reach that presentation when the overlay is skipped; its behavior is specified in `docs/specs/ui-redesign.md` and covered by `BootScreen.test.tsx`.
