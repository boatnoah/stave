# Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please).

1. Merge PRs into `main` with conventional titles. `feat:` bumps the minor version, `fix:` and `perf:` bump the patch, and a `!` (for example `feat!:`) marks a breaking change. Before 1.0, breaking changes bump the minor version.
2. release-please keeps a **release PR** open with the next version and changelog. Merging it tags the release and publishes a GitHub release.
3. The `Release` workflow builds `Stave-<version>-<arch>.dmg` and `.zip` for Apple silicon and Intel and attaches them to the release.
4. Installed apps update from the release ZIPs through update.electronjs.org. macOS only installs updates for signed apps.

To build test artifacts without releasing, run the **Release** workflow manually from the Actions tab. The builds are kept as workflow artifacts for 7 days.

## Repository secrets

Add these under **Settings → Secrets and variables → Actions**. Without the Apple secrets, the workflow builds unsigned apps and logs a warning. macOS Gatekeeper blocks unsigned apps until the user allows them under **System Settings → Privacy & Security**, and they cannot auto-update.

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE_P12` | Base64 of your exported **Developer ID Application** certificate and key: `base64 -i cert.p12 \| pbcopy` |
| `APPLE_CERTIFICATE_PASSWORD` | The password chosen when exporting the `.p12` |
| `APPLE_SIGNING_IDENTITY` | The certificate name, for example `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | The Apple ID email for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password from account.apple.com |
| `APPLE_TEAM_ID` | Your 10-character team ID |
| `RELEASE_PLEASE_TOKEN` | Optional. A fine-grained token with Contents and Pull requests write access to this repository. With it, the release PR runs CI automatically. Without it, close and reopen the release PR to start CI. |

Signing needs an Apple Developer Program membership.

## Local builds

```bash
pnpm --filter @stave/desktop make
```

Artifacts land in `apps/desktop/out/make/`. Export `APPLE_SIGNING_IDENTITY` (and the notarization variables) to sign locally with a certificate in your keychain.
