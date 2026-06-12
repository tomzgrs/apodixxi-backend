import AsyncStorage from '@react-native-async-storage/async-storage';
import { cache } from '../src/services/cache';

describe('cache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores and retrieves data with a timestamp', async () => {
    await cache.set('k', { a: 1 });
    const entry = await cache.get<{ a: number }>('k');
    expect(entry?.data).toEqual({ a: 1 });
    expect(typeof entry?.t).toBe('number');
  });

  it('returns null for a missing key', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('returns null once an entry is older than maxAge', async () => {
    await cache.set('k', { a: 1 });
    // maxAge of -1ms means anything is already expired.
    expect(await cache.get('k', -1)).toBeNull();
  });

  it('removes entries', async () => {
    await cache.set('k', 1);
    await cache.remove('k');
    expect(await cache.get('k')).toBeNull();
  });
});
