export type ReceiptUrlKind = 'supported' | 'epsilon' | 'http' | 'invalid';

/**
 * Classify a scanned QR/barcode payload to decide how the receipt should be
 * imported. Order matters and mirrors the scanner flow:
 *  - `supported`: providers parsed directly server-side (myDATA e-invoicing).
 *  - `epsilon`: Epsilon Digital providers that require the in-app WebView.
 *  - `http`: any other URL — attempted as a best-effort import.
 *  - `invalid`: payload that is not a receipt link.
 */
export function classifyReceiptUrl(data: string): ReceiptUrlKind {
  if (!data) return 'invalid';

  const isSupported =
    data.includes('e-invoicing.gr') ||
    data.includes('einvoice.impact.gr') ||
    data.includes('entersoftone.gr');
  const isEpsilon =
    data.includes('epsilondigital') || data.includes('epsilonnet.gr');

  if (isSupported) return 'supported';
  if (isEpsilon) return 'epsilon';
  if (data.startsWith('http')) return 'http';
  return 'invalid';
}
