import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../src/api';

const okJson = (data: any) => ({ ok: true, status: 200, json: async () => data });
const errJson = (status: number, body: any) => ({
  ok: false,
  status,
  json: async () => body,
});

describe('api', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    global.fetch = jest.fn(async () => okJson({})) as any;
  });

  describe('getDeviceId', () => {
    it('generates and persists a device id', async () => {
      const id = await api.getDeviceId();
      expect(id).toMatch(/^dev_/);
      expect(await AsyncStorage.getItem('device_id')).toBe(id);
    });

    it('returns the same id on subsequent calls', async () => {
      const first = await api.getDeviceId();
      const second = await api.getDeviceId();
      expect(second).toBe(first);
    });
  });

  describe('request URL building', () => {
    it('builds the receipts query with device id and pagination', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        okJson({ receipts: [], total: 0 })
      );
      await api.getReceipts(0, 50, 'γαλα');
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/api/receipts?');
      expect(url).toContain('limit=50');
      expect(url).toContain('search=');
    });

    it('encodes the compare query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(okJson({ stores: {} }));
      await api.compareProducts('γαλα φρέσκο');
      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('/api/products/compare?q=');
      expect(url).not.toContain(' ');
    });
  });

  describe('error handling', () => {
    it('throws the server-provided detail message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        errJson(400, { detail: 'Μη έγκυρο αρχείο' })
      );
      await expect(api.getReceipt('abc')).rejects.toThrow('Μη έγκυρο αρχείο');
    });

    it('falls back to an HTTP status message when no detail is present', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json');
        },
      });
      await expect(api.getReceipt('abc')).rejects.toThrow('Request failed');
    });
  });

  describe('auth headers', () => {
    it('attaches a bearer token when provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(okJson({ ok: true }));
      await api.importFromUrl('https://e-invoicing.gr/x', false, 'token123');
      const opts = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(opts.headers.Authorization).toBe('Bearer token123');
    });

    it('omits the auth header when no token is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(okJson({ ok: true }));
      await api.importFromUrl('https://e-invoicing.gr/x', false);
      const opts = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(opts.headers.Authorization).toBeUndefined();
    });
  });
});
