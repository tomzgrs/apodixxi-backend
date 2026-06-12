import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE } from './services/config';
import { httpFetch, withRetry, ApiError, isOfflineError } from './services/http';
import { cache } from './services/cache';

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem('accessToken');
  }
  return SecureStore.getItemAsync('accessToken');
}

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem('device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    await AsyncStorage.setItem('device_id', id);
  }
  return id;
}

async function request(
  path: string,
  options: RequestInit = {},
  cfg: { retries?: number; timeoutMs?: number } = {},
) {
  const url = `${API_BASE}${path}`;
  const method = ((options.method as string) || 'GET').toUpperCase();
  // Retry idempotent reads on connectivity failures; never auto-retry writes.
  const retries = cfg.retries ?? (method === 'GET' ? 2 : 0);
  return withRetry(async () => {
    const res = await httpFetch(
      url,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}), // Custom headers override defaults
        },
      },
      cfg.timeoutMs,
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new ApiError(err.detail || `HTTP ${res.status}`, res.status);
    }
    return res.json();
  }, { retries });
}

/**
 * Wraps a read so its last successful result is cached and served when the
 * device is offline. The returned payload is tagged with `__fromCache` so the
 * UI can show a "showing saved data" hint.
 */
async function cachedGet<T extends object>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    cache.set(key, data).catch(() => {});
    return data;
  } catch (e) {
    if (isOfflineError(e)) {
      const cached = await cache.get<T>(key);
      if (cached) {
        return { ...cached.data, __fromCache: true, __cachedAt: cached.t };
      }
    }
    throw e;
  }
}

export const api = {
  getDeviceId,

  registerDevice: async (language: string, accessToken?: string | null) => {
    const device_id = await getDeviceId();
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return request('/devices/register', {
      method: 'POST',
      body: JSON.stringify({ device_id, language }),
      headers,
    });
  },

  importFromUrl: async (url: string, forceImport: boolean = false, accessToken?: string | null) => {
    const device_id = await getDeviceId();
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return request('/receipts/import-url', {
      method: 'POST',
      body: JSON.stringify({ device_id, url, force_import: forceImport }),
      headers,
    });
  },

  importFromXml: async (fileUri: string, fileName: string) => {
    const device_id = await getDeviceId();
    const formData = new FormData();
    formData.append('device_id', device_id);
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'text/xml',
    } as any);
    const url = `${API_BASE}/receipts/import-xml`;
    const res = await httpFetch(url, { method: 'POST', body: formData }, 60000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  createManualReceipt: async (data: any) => {
    const device_id = await getDeviceId();
    return request('/receipts/manual', {
      method: 'POST',
      body: JSON.stringify({ ...data, device_id }),
    });
  },

  getReceipts: async (skip = 0, limit = 50, search = '') => {
    const device_id = await getDeviceId();
    const params = new URLSearchParams({ device_id, skip: String(skip), limit: String(limit) });
    if (search) params.append('search', search);
    const path = `/receipts?${params}`;
    // Cache only the default (unfiltered first page) so it stays viewable offline.
    if (!search && skip === 0) {
      return cachedGet(`receipts:${device_id}`, () => request(path));
    }
    return request(path);
  },

  getReceipt: async (id: string) => {
    return request(`/receipts/${id}`);
  },

  deleteReceipt: async (id: string) => {
    return request(`/receipts/${id}`, { method: 'DELETE' });
  },

  searchProducts: async (q: string) => {
    const device_id = await getDeviceId();
    return request(`/products/search?q=${encodeURIComponent(q)}&device_id=${device_id}`);
  },

  compareProducts: async (q: string) => {
    return request(`/products/compare?q=${encodeURIComponent(q)}`);
  },

  getStats: async () => {
    const device_id = await getDeviceId();
    return cachedGet(`stats:${device_id}`, () => request(`/stats?device_id=${device_id}`));
  },

  getAnalytics: async (months: number = 6) => {
    const device_id = await getDeviceId();
    return cachedGet(
      `analytics:${device_id}:${months}`,
      () => request(`/stats/analytics?device_id=${device_id}&months=${months}`),
    );
  },

  getReceiptsByStore: async (storeName: string, skip = 0, limit = 100) => {
    const device_id = await getDeviceId();
    return request(`/receipts/by-store?device_id=${device_id}&store_name=${encodeURIComponent(storeName)}&skip=${skip}&limit=${limit}`);
  },

  validateVat: async (vat: string) => {
    return request(`/stores/validate-vat?vat=${vat}`);
  },

  getSupportedStores: async () => {
    return request('/stores/supported');
  },

  requestStoreReview: async (vat: string, storeName: string, receiptUrl: string) => {
    const device_id = await getDeviceId();
    return request('/stores/request-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vat, store_name: storeName, receipt_url: receiptUrl, device_id }),
    });
  },

  exportData: async () => {
    const device_id = await getDeviceId();
    return request(`/backup/export?device_id=${device_id}`);
  },

  importWebViewData: async (data: {
    device_id: string;
    url: string;
    raw_text: string;
    items: any[];
    store_name: string;
    store_vat?: string;
    found_final_total?: number;
  }) => {
    return request('/receipts/import-webview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Export functions (requires auth token)
  checkExportAccess: async (accessToken: string) => {
    const url = `${API_BASE}/export/check-access`;
    const res = await httpFetch(url, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  exportReceipts: async (accessToken: string): Promise<Blob> => {
    const url = `${API_BASE}/export/receipts`;
    const res = await httpFetch(url, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
      },
    }, 60000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.blob();
  },

  async getSubscriptionStatus() {
    const deviceId = await this.getDeviceId();
    const accessToken = await getStoredToken();
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const res = await httpFetch(`${API_BASE}/subscription/status?device_id=${deviceId}`, {
      headers
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getCategoryStats() {
    const device_id = await getDeviceId();
    return request(`/stats/categories?device_id=${device_id}`);
  },

  async getCategoryProducts(category: string, subcategory?: string, month?: string) {
      const device_id = await getDeviceId();
      const params = new URLSearchParams({ device_id, category });
      if (subcategory) params.append('subcategory', subcategory);
      if (month) params.append('month', month);
      return request(`/stats/category-products?${params}`);
    },

    async setOverride(item_name: string, category: string, subcategory: string = '') {
      const device_id = await getDeviceId();
      const params = new URLSearchParams({ device_id, item_name, category, subcategory });
      return request(`/overrides?${params}`, { method: 'PUT' });
    },

    async getOverrides() {
      const device_id = await getDeviceId();
      return request(`/overrides?device_id=${device_id}`);
    },

    async deleteOverride(item_name: string) {
      const device_id = await getDeviceId();
      const params = new URLSearchParams({ device_id, item_name });
      return request(`/overrides?${params}`, { method: 'DELETE' });
    },

    async getProductPrices(description: string) {
    const accessToken = await getStoredToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const params = new URLSearchParams({ description });
    const res = await httpFetch(`${API_BASE}/products/prices?${params}`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

    getCustomCategories: async () => {
      const device_id = await getDeviceId();
      return request(`/categories/custom?device_id=${device_id}`);
    },

    addCustomCategory: async (name: string, subcategories: string[]) => {
      const device_id = await getDeviceId();
      return request('/categories/custom', {
        method: 'POST',
        body: JSON.stringify({ device_id, name, subcategories }),
      });
    },

    deleteCustomCategory: async (name: string) => {
      const device_id = await getDeviceId();
      return request(`/categories/custom/${encodeURIComponent(name)}?device_id=${device_id}`, {
        method: 'DELETE',
      });
    },

    getBestPrice: async (name: string) => {
      return request(`/products/best-price?name=${encodeURIComponent(name)}`);
    },

    getFavorites: async () => {
      const device_id = await getDeviceId();
      return request(`/favorites?device_id=${device_id}`);
    },

    addFavorite: async (name: string) => {
      const device_id = await getDeviceId();
      return request('/favorites', {
        method: 'POST',
        body: JSON.stringify({ device_id, name }),
      });
    },

    removeFavorite: async (name: string) => {
      const device_id = await getDeviceId();
      return request(`/favorites/${encodeURIComponent(name)}?device_id=${device_id}`, {
        method: 'DELETE',
      });
    },
  };
  