export type SortOption = 'price_asc' | 'price_desc' | 'store' | 'date';

export interface ProductResult {
  description: string;
  store_name: string;
  last_price: number;
  last_unit_price: number;
  last_date: string;
  price_history?: Array<{
    price: number;
    unit_price: number;
    date: string;
    quantity: number;
    receipt_id: string;
  }>;
}

export interface PriceStats {
  cheapest: ProductResult | null;
  mostExpensive: ProductResult | null;
  priceDifference: number;
  savingsPercent: number | string;
}

/**
 * Flatten the `{ stores: { [store]: ProductResult[] } }` shape returned by the
 * compare endpoint into a single list, stamping each entry with its store name.
 */
export function flattenStores(results: any): ProductResult[] {
  if (!results || !results.stores) return [];
  return Object.entries(results.stores).flatMap(([store, products]: [string, any]) =>
    (products as any[]).map((p: any) => ({ ...p, store_name: store }))
  );
}

/** Return a new array sorted by the chosen option (does not mutate input). */
export function sortProducts(products: ProductResult[], sortBy: SortOption): ProductResult[] {
  return [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.last_price - b.last_price;
      case 'price_desc':
        return b.last_price - a.last_price;
      case 'store':
        return a.store_name.localeCompare(b.store_name);
      case 'date':
        return (b.last_date || '').localeCompare(a.last_date || '');
      default:
        return 0;
    }
  });
}

/** Compute cheapest/most-expensive entries and the potential savings. */
export function computePriceStats(products: ProductResult[]): PriceStats {
  const cheapest =
    products.length > 0
      ? products.reduce((min, p) => (p.last_price < min.last_price ? p : min), products[0])
      : null;
  const mostExpensive =
    products.length > 0
      ? products.reduce((max, p) => (p.last_price > max.last_price ? p : max), products[0])
      : null;

  const priceDifference =
    cheapest && mostExpensive ? mostExpensive.last_price - cheapest.last_price : 0;
  const savingsPercent =
    mostExpensive && mostExpensive.last_price > 0
      ? ((priceDifference / mostExpensive.last_price) * 100).toFixed(0)
      : 0;

  return { cheapest, mostExpensive, priceDifference, savingsPercent };
}

/**
 * Compute the savings badge for a candidate store price relative to the price
 * the user actually paid. Returns null when there is nothing meaningful to show
 * (no reference price, invalid price, or a difference under 1%).
 */
export function getSavingsBadge(
  currentPrice: number,
  price: number
): { diff: number; pct: number } | null {
  if (!currentPrice || price <= 0) return null;
  const diff = currentPrice - price;
  const pct = Math.round((diff / currentPrice) * 100);
  if (Math.abs(pct) < 1) return null;
  return { diff, pct };
}
