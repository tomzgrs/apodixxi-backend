import { API_BASE } from './config';

type Listener = (online: boolean) => void;

const PROBE_TIMEOUT_MS = 8000;

let online = true;
const listeners = new Set<Listener>();

function setOnline(next: boolean): void {
  if (next === online) return;
  online = next;
  listeners.forEach((l) => {
    try {
      l(online);
    } catch {
      /* a misbehaving subscriber must not break the others */
    }
  });
}

/**
 * Lightweight, native-module-free connectivity tracker.
 *
 * State is driven passively by the outcome of real API calls (see `http.ts`):
 * any HTTP response means the server is reachable (online); a fetch rejection
 * (DNS failure, no route, timeout) means offline. `probe()` actively checks
 * reachability to detect recovery while offline.
 */
export const connectivity = {
  isOnline: (): boolean => online,
  notifyOnline: (): void => setOnline(true),
  notifyOffline: (): void => setOnline(false),

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Pings the backend. Any HTTP response (even an error status) means the
   * network is up. Only a rejected fetch / timeout counts as offline.
   */
  async probe(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      await fetch(API_BASE, { method: 'HEAD', signal: controller.signal });
      setOnline(true);
      return true;
    } catch {
      setOnline(false);
      return false;
    } finally {
      clearTimeout(timer);
    }
  },

  /** Test helper — reset module state between tests. */
  _reset(): void {
    online = true;
    listeners.clear();
  },
};
