import { connectivity } from './connectivity';

export const DEFAULT_TIMEOUT_MS = 15000;

/** The device could not reach the server (no network / DNS / connection refused). */
export class NetworkError extends Error {
  readonly code = 'network';
  constructor(message = 'Πρόβλημα σύνδεσης. Ελέγξτε το διαδίκτυό σας.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** The request took too long and was aborted. */
export class TimeoutError extends Error {
  readonly code = 'timeout';
  constructor(message = 'Η σύνδεση έληξε. Δοκιμάστε ξανά.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** The server responded with a non-2xx status. */
export class ApiError extends Error {
  readonly code = 'http';
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** True for connectivity-related failures (as opposed to server/HTTP errors). */
export function isOfflineError(e: unknown): e is NetworkError | TimeoutError {
  return e instanceof NetworkError || e instanceof TimeoutError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch wrapper that adds a hard timeout and keeps the global connectivity
 * state in sync. Resolves with the raw Response (any status); throws
 * NetworkError / TimeoutError when the request never reached the server.
 */
export async function httpFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    connectivity.notifyOnline();
    return res;
  } catch (e: unknown) {
    connectivity.notifyOffline();
    if (e instanceof Error && e.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
}

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  shouldRetry?: (e: unknown) => boolean;
}

/** Runs `fn`, retrying with exponential backoff on connectivity failures. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 0, baseDelayMs = 300, shouldRetry = isOfflineError }: RetryOptions = {},
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries || !shouldRetry(e)) throw e;
      await sleep(baseDelayMs * 2 ** attempt);
      attempt += 1;
    }
  }
}
