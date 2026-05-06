import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_BASE = `${BACKEND_URL}/api`;

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem('device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    await AsyncStorage.setItem('device_id', id);
  }
  return id;
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 
      'Content-Type': 'application/json', 
      ...(options.headers || {})  // Custom headers override defaults
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getDeviceId,

  registerDevice: async (language: string) => {
    const device_id = await getDeviceId();
    return request('/devices/register', {
      method: 'POST',
      body: JSON.stringify({ device_id, language }),
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
    const res = await fetch(url, { method: 'POST', body: formData });
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
    return request(`/receipts?${params}`);
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
    return request(`/stats?device_id=${device_id}`);
  },

  getAnalytics: async (months: number = 6) => {
    const device_id = await getDeviceId();
    return request(`/stats/analytics?device_id=${device_id}&months=${months}`);
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
    const res = await fetch(url, {
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
    const res = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.blob();
  },
};
