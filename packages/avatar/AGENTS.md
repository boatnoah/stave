# avatar

- Browser-safe: no Node or Electron imports.
- A persisted seed plus appearance version must always render the same character. Never alter an existing version's output; add a new version and keep the old renderer.
- Motion reflects real execution state only, and reduced-motion users get the same information statically.
