import {
  flattenStores,
  sortProducts,
  computePriceStats,
  getSavingsBadge,
  type ProductResult,
} from '../src/services/priceCompare';

const make = (
  store: string,
  price: number,
  date = '2026-01-01',
  description = 'ΓΑΛΑ'
): ProductResult => ({
  description,
  store_name: store,
  last_price: price,
  last_unit_price: price,
  last_date: date,
});

describe('flattenStores', () => {
  it('returns [] for null/empty input', () => {
    expect(flattenStores(null)).toEqual([]);
    expect(flattenStores({})).toEqual([]);
    expect(flattenStores({ stores: {} })).toEqual([]);
  });

  it('flattens the store map and stamps store_name', () => {
    const out = flattenStores({
      stores: {
        AB: [{ description: 'ΓΑΛΑ', last_price: 1.2 }],
        LIDL: [
          { description: 'ΓΑΛΑ', last_price: 1.1 },
          { description: 'ΨΩΜΙ', last_price: 0.9 },
        ],
      },
    });
    expect(out).toHaveLength(3);
    expect(out.every((p) => typeof p.store_name === 'string')).toBe(true);
    expect(out.filter((p) => p.store_name === 'LIDL')).toHaveLength(2);
  });
});

describe('sortProducts', () => {
  const products = [make('AB', 2), make('LIDL', 1), make('METRO', 3)];

  it('sorts ascending by price', () => {
    expect(sortProducts(products, 'price_asc').map((p) => p.last_price)).toEqual([1, 2, 3]);
  });

  it('sorts descending by price', () => {
    expect(sortProducts(products, 'price_desc').map((p) => p.last_price)).toEqual([3, 2, 1]);
  });

  it('sorts alphabetically by store', () => {
    expect(sortProducts(products, 'store').map((p) => p.store_name)).toEqual([
      'AB',
      'LIDL',
      'METRO',
    ]);
  });

  it('sorts by date descending', () => {
    const byDate = [
      make('AB', 1, '2026-01-01'),
      make('LIDL', 1, '2026-03-01'),
      make('METRO', 1, '2026-02-01'),
    ];
    expect(sortProducts(byDate, 'date').map((p) => p.last_date)).toEqual([
      '2026-03-01',
      '2026-02-01',
      '2026-01-01',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [make('AB', 2), make('LIDL', 1)];
    const snapshot = input.map((p) => p.last_price);
    sortProducts(input, 'price_asc');
    expect(input.map((p) => p.last_price)).toEqual(snapshot);
  });
});

describe('computePriceStats', () => {
  it('returns nulls/zeros for an empty list', () => {
    expect(computePriceStats([])).toEqual({
      cheapest: null,
      mostExpensive: null,
      priceDifference: 0,
      savingsPercent: 0,
    });
  });

  it('computes cheapest, most expensive, difference and savings percent', () => {
    const stats = computePriceStats([make('AB', 2), make('LIDL', 1), make('METRO', 4)]);
    expect(stats.cheapest?.last_price).toBe(1);
    expect(stats.mostExpensive?.last_price).toBe(4);
    expect(stats.priceDifference).toBe(3);
    expect(stats.savingsPercent).toBe('75');
  });
});

describe('getSavingsBadge', () => {
  it('returns null when there is no reference price', () => {
    expect(getSavingsBadge(0, 5)).toBeNull();
  });

  it('returns null when the candidate price is invalid', () => {
    expect(getSavingsBadge(5, 0)).toBeNull();
    expect(getSavingsBadge(5, -1)).toBeNull();
  });

  it('returns null when the difference is under 1%', () => {
    expect(getSavingsBadge(100, 99.6)).toBeNull();
  });

  it('returns a positive badge when the candidate is cheaper', () => {
    expect(getSavingsBadge(10, 8)).toEqual({ diff: 2, pct: 20 });
  });

  it('returns a negative badge when the candidate is more expensive', () => {
    const badge = getSavingsBadge(10, 12);
    expect(badge?.pct).toBe(-20);
    expect(badge && badge.diff < 0).toBe(true);
  });
});
