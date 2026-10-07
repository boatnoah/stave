# Security policy

Stave runs coding agents against local repositories, so sandbox escapes, unintended network access, IPC validation gaps, and Electron hardening regressions are all in scope.

Report vulnerabilities privately through [GitHub security advisories](https://github.com/boatnoah/stave/security/advisories/new). Do not open a public issue. Expect an acknowledgement within a week.

Only the latest release is supported.

## Automated checks

- CodeQL scans JavaScript, TypeScript, and workflow files on every PR and on `main`.
- Dependency review blocks PRs that add moderate-or-worse vulnerabilities or GPL/AGPL licenses.
- zizmor audits GitHub Actions workflows.
- Secret scanning with push protection rejects pushes that contain credentials.
- Dependabot opens grouped weekly updates and security fixes.
- End-to-end tests assert the Electron renderer stays sandboxed and isolated.
