// Store logo URLs mapping
// Maps store names to their logo image URLs

export const STORE_LOGOS: Record<string, string> = {
  // Major Greek supermarket chains
  "ΜΑΣΟΥΤΗΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/j27j2dvf_1000077071.png",
  "MASOUTIS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/j27j2dvf_1000077071.png",
  
  "MARKET IN": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/lkyyp0pd_1000077070.png",
  "MARKETIN": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/lkyyp0pd_1000077070.png",
  
  "ΣΚΛΑΒΕΝΙΤΗΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/fo5lwyzr_1000077068.png",
  "SKLAVENITIS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/fo5lwyzr_1000077068.png",
  
  "ΘΑΝΟΠΟΥΛΟΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/t6g0ywx7_1000077067.png",
  "THANOPOULOS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/t6g0ywx7_1000077067.png",
};

// Get logo URL for a store, returns null if not found
export function getStoreLogo(storeName: string): string | null {
  if (!storeName) return null;
  
  const nameUpper = storeName.toUpperCase().trim();
  
  // Direct match
  if (STORE_LOGOS[nameUpper]) {
    return STORE_LOGOS[nameUpper];
  }
  
  // Partial match
  for (const [key, url] of Object.entries(STORE_LOGOS)) {
    if (nameUpper.includes(key) || key.includes(nameUpper)) {
      return url;
    }
  }
  
  return null;
}

// Check if store has a logo
export function hasStoreLogo(storeName: string): boolean {
  return getStoreLogo(storeName) !== null;
}
