# apodixxi — iOS build guide

The app is a managed Expo/EAS project (no native `ios/` dir). All iOS config is
in `app.json`, `eas.json`, and config plugins. Android is unaffected by any of this.

## Required credentials (must be supplied before a *real* iOS build)

| What | Where to get it | Where it goes |
| --- | --- | --- |
| Apple Developer Program membership | developer.apple.com (paid) | Needed for any **signed** device / TestFlight / App Store build. Not needed for a **simulator** build. EAS generates the distribution cert + provisioning profile interactively. |
| iOS OAuth Client ID (Google Sign-In) | Google Cloud Console → Credentials → Create OAuth client → type **iOS**, bundle id `com.apodixxi.app` | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `eas.json`, and its **reversed** form as `iosUrlScheme` in the `@react-native-google-signin/google-signin` plugin in `app.json`. |
| AdMob iOS App ID + ad unit IDs | AdMob console → add an iOS app | `iosAppId` in the `react-native-google-mobile-ads` plugin in `app.json`, and the iOS banner id in `app/(tabs)/_layout.tsx`. |

### iOS credentials status
All iOS credential placeholders have been wired with real values:
- `eas.json` → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` set to `889769499922-i22pgttm5dnai4804fvsft7l8sacrn0n.apps.googleusercontent.com` (in both `preview-ios` and `production`).
- `app.json` → google-signin plugin `iosUrlScheme` set to `com.googleusercontent.apps.889769499922-i22pgttm5dnai4804fvsft7l8sacrn0n`.
- `app.json` → AdMob `iosAppId` set to `ca-app-pub-2145791775687228~7716615162` (real apodixxi iOS app).

### Ads on iOS — current decision
iOS now uses the **real apodixxi AdMob iOS app ID** (`ca-app-pub-2145791775687228~7716615162`
in `app.json`). The iOS banner ad unit in `app/(tabs)/_layout.tsx` still falls back to a
test unit until a real iOS ad unit ID is created in the AdMob console.

## Build profiles (`eas.json`)
- **`preview-ios`** — `ios.simulator: true`. **No Apple account needed.** Produces a
  `.app` runnable on the iOS Simulator or uploadable to Appetize.io. Use this to
  validate the iOS build without a Mac/iPhone.
- **`production`** — signed iOS build (App Store / TestFlight). **Requires the Apple
  Developer account** for credentials.

## Commands
Auth uses the `EXPO_TOKEN` secret (already in the repl env). Run via a temporary
`console` workflow (the upload exceeds the 2-min bash limit; backgrounded shells
get killed). Always set `EAS_NO_VCS=1` (the monorepo `.git` triggers the sandbox's
git guard) and use `npx --yes` (avoids npx's interactive install prompt).

Simulator build (no Apple account):
```
cd apodixxi-frontend/frontend && EAS_NO_VCS=1 \
  npx --yes eas-cli@latest build --platform ios --profile preview-ios \
  --non-interactive --no-wait
```

Signed App Store / TestFlight build (needs Apple account; run interactively the
first time so EAS can create credentials):
```
cd apodixxi-frontend/frontend && EAS_NO_VCS=1 \
  npx --yes eas-cli@latest build --platform ios --profile production
```

OTA JS-only update to an existing iOS build (same channel as Android, branch
`preview`):
```
cd apodixxi-frontend/frontend && \
  npx --yes eas-cli@latest update --branch preview --message "..." --non-interactive
```

## Notes
- `runtimeVersion.policy = appVersion`, so iOS and Android OTA channels are keyed
  by app version independently — Android OTA is unaffected by iOS work.
- `ITSAppUsesNonExemptEncryption: false` is set (app uses only standard HTTPS),
  so no manual export-compliance step in App Store Connect.
- The `eas-build-pre-install.sh` lockfile fix runs on iOS builds too.
