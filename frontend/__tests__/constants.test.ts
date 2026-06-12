import {
  formatPrice,
  formatDate,
  getStoreColor,
  getStoreInitial,
} from '../src/constants';

describe('formatPrice', () => {
  it('formats with two decimals and euro sign', () => {
    expect(formatPrice(1)).toBe('1.00€');
    expect(formatPrice(2.5)).toBe('2.50€');
    expect(formatPrice(0)).toBe('0.00€');
  });

  it('rounds to two decimals', () => {
    expect(formatPrice(1.005)).toBe('1.00€');
    expect(formatPrice(1.999)).toBe('2.00€');
  });
});

describe('formatDate', () => {
  it('returns empty string for falsy input', () => {
    expect(formatDate('')).toBe('');
  });

  it('strips the time portion of an ISO string', () => {
    expect(formatDate('2026-06-12T10:30:00Z')).toBe('2026-06-12');
  });

  it('leaves already-formatted dates untouched', () => {
    expect(formatDate('12-06-2026')).toBe('12-06-2026');
  });
});

describe('getStoreColor', () => {
  it('returns the brand color for a known store (case-insensitive, partial match)', () => {
    expect(getStoreColor('ΣΚΛΑΒΕΝΙΤΗΣ')).toBe('#E35205');
    expect(getStoreColor('sklavenitis ΑΕ')).toBe('#E35205');
    expect(getStoreColor('LIDL HELLAS')).toBe('#0050AA');
  });

  it('generates a deterministic hsl color for unknown stores', () => {
    const a = getStoreColor('Unknown Shop');
    const b = getStoreColor('Unknown Shop');
    expect(a).toBe(b);
    expect(a).toMatch(/^hsl\(\d{1,3}, 65%, 45%\)$/);
  });
});

describe('getStoreInitial', () => {
  it('returns ? for empty input', () => {
    expect(getStoreInitial('')).toBe('?');
  });

  it('uses first letters of the first two words', () => {
    expect(getStoreInitial('My Market')).toBe('MM');
    expect(getStoreInitial('Market-In')).toBe('MI');
  });

  it('uses first two characters for a single word', () => {
    expect(getStoreInitial('Jumbo')).toBe('JU');
  });
});
