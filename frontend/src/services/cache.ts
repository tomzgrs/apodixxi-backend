import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'cache:';

export interface CachedEntry<T> {
  /** Epoch ms when the entry was written. */
  t: number;
  data: T;
}

/**
 * Tiny AsyncStorage-backed cache for read data, so key screens stay viewable
 * offline. All operations swallow errors — caching must never break a flow.
 */
export const cache = {
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const entry: CachedEntry<T> = { t: Date.now(), data };
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      /* ignore write failures */
    }
  },

  async get<T>(key: string, maxAgeMs?: number): Promise<CachedEntry<T> | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedEntry<T>;
      if (maxAgeMs != null && Date.now() - parsed.t > maxAgeMs) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};
