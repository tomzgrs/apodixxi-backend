// Store logo URLs mapping
// Maps store names to their logo image URLs

export const STORE_LOGOS: Record<string, string> = {
  // Major Greek supermarket chains
  "ΜΑΣΟΥΤΗΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/j27j2dvf_1000077071.png",
  "MASOUTIS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/j27j2dvf_1000077071.png",
  
  "MARKET IN": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/r0x17unb_1000077079.png",
  "MARKETIN": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/r0x17unb_1000077079.png",
  
  "ΣΚΛΑΒΕΝΙΤΗΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/fo5lwyzr_1000077068.png",
  "SKLAVENITIS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/fo5lwyzr_1000077068.png",
  
  "ΘΑΝΟΠΟΥΛΟΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/t6g0ywx7_1000077067.png",
  "THANOPOULOS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/t6g0ywx7_1000077067.png",
  
  "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/bewsxvin_1000077072.jpg",
  "ΑΒ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/bewsxvin_1000077072.jpg",
  "AB VASILOPOULOS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/bewsxvin_1000077072.jpg",
  "AB": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/bewsxvin_1000077072.jpg",
  
  "JUMBO": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/zi4p5y9b_1000077085.webp",
  "ΤΖΑΜΠΟ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/zi4p5y9b_1000077085.webp",
  
  "LIDL": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/utth4145_1000077083.png",
  "ΛΙΝΤΛ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/utth4145_1000077083.png",
  
  "ΣΥΝ.ΚΑ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/pqs07mmr_1000077082.png",
  "SYNKA": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/pqs07mmr_1000077082.png",
  "ΣΥΝΚΑ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/pqs07mmr_1000077082.png",
  
  "ΓΑΛΑΞΙΑΣ": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/v2uqqihi_1000077078.png",
  "GALAXIAS": "https://customer-assets.emergentagent.com/job_deal-finder-396/artifacts/v2uqqihi_1000077078.png",
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
