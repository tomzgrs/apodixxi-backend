import { initSentry, sentryEnabled, Sentry } from '../src/sentry';

describe('sentry gating', () => {
  it('is disabled in the test/dev environment (no DSN, __DEV__)', () => {
    expect(sentryEnabled).toBe(false);
  });

  it('does not call Sentry.init when reporting is disabled', () => {
    (Sentry.init as jest.Mock).mockClear();
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
