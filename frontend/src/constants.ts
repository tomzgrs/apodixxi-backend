export const COLORS = {
  primary: '#059669',
  primaryLight: '#ECFDF5',
  primaryDark: '#047857',
  secondary: '#F97316',
  secondaryLight: '#FFF7ED',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  success: '#10B981',
  successLight: '#ECFDF5',
};

export const STORE_COLORS: Record<string, string> = {
  'ΣΚΛΑΒΕΝΙΤΗΣ': '#E35205',
  'ΣΚΛΑΒΕΝΙΤΗ': '#E35205',
  'SKLAVENITIS': '#E35205',
  'ΜΑΣΟΥΤΗΣ': '#00A651',
  'MASOUTIS': '#00A651',
  'ΒΑΣΙΛΟΠΟΥΛΟΣ': '#005696',
  'AB': '#005696',
  'MY MARKET': '#FF6600',
  'MYMARKET': '#FF6600',
  'METRO': '#FF6600',
  'MARKET IN': '#E30613',
  'MARKETIN': '#E30613',
  'JUMBO': '#FFD700',
  'LIDL': '#0050AA',
  'BAZAAR': '#D4145A',
};

export function getStoreColor(storeName: string): string {
  const upper = storeName.toUpperCase();
  for (const [key, color] of Object.entries(STORE_COLORS)) {
    if (upper.includes(key)) return color;
  }
  // Generate consistent color from name
  let hash = 0;
  for (let i = 0; i < storeName.length; i++) {
    hash = storeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

export function getStoreInitial(storeName: string): string {
  if (!storeName) return '?';
  const words = storeName.split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return storeName.substring(0, 2).toUpperCase();
}

export function formatPrice(price: number): string {
  return price.toFixed(2) + '€';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Already formatted as DD-MM-YYYY or DD/MM/YYYY
  return dateStr.split('T')[0];
}
