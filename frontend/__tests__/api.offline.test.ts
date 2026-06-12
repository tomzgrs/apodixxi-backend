import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../src/api';
import { connectivity } from '../src/services/connectivity';
import { ApiError, NetworkError, TimeoutError, httpFetch } from '../src/services/http';

const okJson = (data: any) => ({ ok: true, status: 200, json: async () => data });
const networkDown = () =>
  jest.fn(async () => {
    throw new TypeError('Network request failed');
  });

describe('api offline resilience', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    connectivity._reset();
  });
  afterEach(() => jest.restoreAllMocks());

  it('caches the default receipts list and serves it when offline', async () => {
    global.fetch = jest.fn(async () => okJson({ receipts: [{ id: 'r1' }], total: 1 })) as any;
    const first: any = await api.getReceipts(0, 100, '');
    expect(first.receipts).toHaveLength(1);
    expect(first.__fromCache).toBeUndefined();

    global.fetch = networkDown() as any;
    const second: any = await api.getReceipts(0, 100, '');
    expect(second.receipts).toHaveLength(1);
    expect(second.__fromCache).toBe(true);
    expect(connectivity.isOnline()).toBe(false);
  });

  it('retries idempotent GET requests on connectivity failures', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(okJson({ ok: true }));
    global.fetch = fetchMock as any;

    const res = await api.getReceipt('abc'); // GET, not cached
    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws a NetworkError when offline with no cached fallback', async () => {
    global.fetch = networkDown() as any;
    await expect(api.getReceipt('abc')).rejects.toBeInstanceOf(NetworkError);
  });

  it('does NOT retry server (5xx) responses', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'boom' }),
    }));
    global.fetch = fetchMock as any;

    await expect(api.getReceipt('abc')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps an aborted (timed-out) request to a TimeoutError', async () => {
    global.fetch = jest.fn(async () => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }) as any;

    await expect(httpFetch('https://example.com', {}, 10)).rejects.toBeInstanceOf(TimeoutError);
    expect(connectivity.isOnline()).toBe(false);
  });
});
