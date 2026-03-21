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
    headers: { 'Content-Type': 'application/json', ...options.headers },
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

  importFromUrl: async (url: string) => {
    const device_id = await getDeviceId();
    return request('/receipts/import-url', {
      method: 'POST',
      body: JSON.stringify({ device_id, url }),
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

  exportData: async () => {
    const device_id = await getDeviceId();
    return request(`/backup/export?device_id=${device_id}`);
  },
};
