import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Crash reporting is enabled only in non-dev builds (preview/production) AND
// only when a DSN is configured. Local development stays quiet so it never
// pollutes the dashboard or slows the dev loop.
export const sentryEnabled = !__DEV__ && !!dsn;

export function initSentry() {
  if (!sentryEnabled) return;

  Sentry.init({
    dsn,
    // Release/dist and source-map context are injected automatically by the
    // @sentry/react-native Expo config plugin during the EAS build.
    sendDefaultPii: false,
    // No performance/APM tracing for now (out of scope) — keep payloads small.
    tracesSampleRate: 0,
  });
}

export { Sentry };
