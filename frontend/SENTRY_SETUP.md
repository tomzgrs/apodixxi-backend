# Crash reporting (Sentry)

The app reports JS errors and native crashes via `@sentry/react-native`, plus a
top-level error boundary that shows a friendly fallback instead of a white screen.

## How it behaves
- **Local development:** completely silent — `initSentry()` is a no-op when
  `__DEV__` is true or no DSN is set.
- **Preview / production builds:** active **only** once a DSN is provided.
- No PII is sent (`sendDefaultPii: false`); performance tracing is off
  (`tracesSampleRate: 0`).

## One-time setup (requires a Sentry account)
1. Create a project at https://sentry.io (platform: React Native) and copy its
   **DSN**, **organization slug**, and **project slug**.
2. In `app.json`, replace the placeholders in the `@sentry/react-native` plugin
   config: `REPLACE_WITH_SENTRY_ORG` and `REPLACE_WITH_SENTRY_PROJECT`.
3. Create EAS secrets so the values reach the build:
   - `EXPO_PUBLIC_SENTRY_DSN` — the DSN (inlined into the JS bundle at build time;
     enables runtime reporting).
   - `SENTRY_AUTH_TOKEN` — a Sentry auth token with project write + release scopes
     (used by the config plugin to upload source maps so stack traces are
     readable). Without it the build still succeeds; source maps are just skipped.

   ```sh
   eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://...ingest.sentry.io/..."
   eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "sntrys_..."
   ```
4. Rebuild with EAS (native change — not an OTA update).

## Verifying
After installing a build with the DSN configured, trigger a test error (e.g. a
throw in a screen) and confirm it appears in the Sentry dashboard with a readable
(source-mapped) stack trace and the correct release/version.

## Where it lives
- `src/sentry.ts` — init + `sentryEnabled` flag.
- `src/components/ErrorBoundary.tsx` — fallback UI + error reporting.
- `app/_layout.tsx` — calls `initSentry()`, wraps the root in `ErrorBoundary` and
  `Sentry.wrap()`.
- `app.json` — `@sentry/react-native` Expo config plugin (source-map upload).
