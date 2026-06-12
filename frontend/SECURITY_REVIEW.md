# apodixxi+ Mobile App — Security Review

**Date:** 2026-06-12
**Scope:** The Expo / React Native mobile app in `apodixxi-frontend/frontend`
(auth & token storage, sign-in flows, permissions, data sent to the backend,
dependencies, static code review).
**Out of scope:** Backend (`server.py`) penetration testing; formal third-party
certification.

## Summary

The mobile app is in **good security shape**. Auth tokens are stored in the OS
secure keystore, no secrets are hardcoded or committed, permissions are minimal
and justified, and there are no dangerous dynamic-code or insecure-transport
patterns. All dependency vulnerabilities found are in **build-time tooling only**
and are not shipped in the app binary. One minor logging line was removed; the
remaining items are low-risk and documented as accepted risk or hardening
recommendations.

## 1. Dependency audit

Ran an OSV-based dependency audit over the workspace.

- **npm (the mobile app): 133 advisories — all in transitive build/dev tooling.**
  Affected packages (`@xmldom/xmldom`, `node-forge`, `undici`, `tar`,
  `shell-quote`, `js-yaml`, `ajv`, `flatted`, `postcss`, `minimatch`,
  `picomatch`, `eslint/plugin-kit`, etc.) are all transitive dependencies of the
  Expo CLI / Metro bundler / EAS build / ESLint toolchain.
  - **Verified not shipped:** none are declared as direct dependencies and none
    are imported anywhere in `src/` or `app/`. Several (e.g. `undici`, `tar`,
    `node-forge`, `shell-quote`) are Node-only and cannot run in the
    React Native (Hermes) runtime. They execute on the developer/build machine,
    not on the user's device, so they are **not exploitable in the released app**.
  - **Decision — accepted risk:** not patched via `yarn` `resolutions`. The
    EAS production build for RN 0.81.5 is sensitive to toolchain version changes
    and cannot be fully verified from this environment; bumping transitive build
    deps risks breaking the build for zero user-facing security gain. Re-audit and
    bump opportunistically when the toolchain is next upgraded.
- **PyPI advisories (incl. 2 critical, e.g. PyJWT):** belong to the **backend**,
  which is out of scope for this review.

## 2. Secret & token handling

- **Tokens use secure storage.** `accessToken` and `refreshToken` are stored via
  `expo-secure-store` on native (iOS Keychain / Android Keystore). `AsyncStorage`
  is used only on **web**, where SecureStore is unavailable — acceptable fallback.
  Token reads in `src/api.ts` and `src/components/AIAssistant.tsx` follow the same
  native-secure / web-fallback pattern.
- **No secrets hardcoded or committed.** Repo-wide search found no API keys,
  passwords, or private keys. The Google OAuth **client ID** present in
  `GoogleSignInButton.tsx` is public by design (not a secret) and is overridable
  via env var.
- **No sensitive data logged.** No `console.*` call logs a token, password, or
  email. **Fixed:** removed a `console.log` that printed the synced `device_id`
  in `AuthContext.tsx`.
- **No insecure transport.** No `http://` endpoints; the API base resolves to
  `https://api.apodixxi.app`.
- **No dynamic code execution.** No `eval`, `new Function`, or
  `dangerouslySetInnerHTML` in the app.

## 3. Permissions & data review

- **iOS** (`app.json`): only `NSCameraUsageDescription` ("Scan receipt QR codes to
  import purchases") — accurate and minimal. `ITSAppUsesNonExemptEncryption: false`.
- **Android:** only `CAMERA` is requested; `RECORD_AUDIO`, `READ_SMS`, and
  `RECEIVE_SMS` are explicitly in `blockedPermissions`. Good minimal posture.
- **Data sent to backend** (`src/api.ts`): device id, language, receipt URLs/XML,
  search queries, and category overrides — all consistent with the app's stated
  function. Authenticated calls send the token as a `Bearer` header over HTTPS.

## 4. Static review

No dynamic-code or unsafe-HTML patterns. The privacy/dataflow scan found **no
findings in the mobile app code** (its hits were all in the out-of-scope backend).

## Accepted risks & hardening recommendations

1. **Build-time dependency advisories (accepted):** not shipped to users; re-audit
   on the next toolchain upgrade. See section 1.
2. **`savedEmail` in AsyncStorage (low):** standard "remember email" UX; the email
   is low-sensitivity and only stored when the user opts in.
3. **WebView importer has no navigation allow-list (hardening):**
   `app/webview-import.tsx` loads the user-supplied retailer URL and runs scraping
   JS on it. It only reads receipt data and posts it back over the standard
   `ReactNativeWebView` bridge, so risk is low, but restricting navigation to the
   supported retailer domains would harden it further.
4. **Placeholder config values (hygiene, not a vulnerability):** `app.json` still
   contains `REPLACE_WITH_…` placeholders for Sentry org/project and the Google
   iOS URL scheme. These should be filled in (or the plugins removed) before iOS
   release so crash reporting and iOS Google sign-in work.
