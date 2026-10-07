import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";

// Signing and notarization switch on when the Apple credentials are present
// (see docs/releasing.md). Without them, builds are unsigned.
const {
  APPLE_SIGNING_IDENTITY,
  APPLE_ID,
  APPLE_APP_SPECIFIC_PASSWORD,
  APPLE_TEAM_ID,
} = process.env;
const notarize = APPLE_ID && APPLE_APP_SPECIFIC_PASSWORD && APPLE_TEAM_ID;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "Stave",
    executableName: "Stave",
    appBundleId: "com.boatnoah.stave",
    appCategoryType: "public.app-category.developer-tools",
    ...(APPLE_SIGNING_IDENTITY && {
      osxSign: {
        identity: APPLE_SIGNING_IDENTITY,
        optionsForFile: () => ({
          hardenedRuntime: true,
          entitlements: "build/entitlements.mac.plist",
        }),
      },
    }),
    ...(APPLE_SIGNING_IDENTITY &&
      notarize && {
        osxNotarize: {
          appleId: APPLE_ID,
          appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
          teamId: APPLE_TEAM_ID,
        },
      }),
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ["darwin"]),
    new MakerDMG({ format: "ULFO" }, ["darwin"]),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.mts",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.mts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
