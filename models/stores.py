"""Store-related constants and utilities."""

# VAT to Store Name mapping - Major Greek supermarket chains
STORE_VAT_MAPPING = {
    # 1. ΣΚΛΑΒΕΝΙΤΗΣ
    "800764388": "ΣΚΛΑΒΕΝΙΤΗΣ",
    
    # 2. ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ
    "094025817": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "094014249": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "094059506": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    
    # 3. METRO
    "094062259": "METRO",
    
    # 4. ΜΑΣΟΥΤΗΣ
    "094063140": "ΜΑΣΟΥΤΗΣ",
    "094063169": "ΜΑΣΟΥΤΗΣ",
    
    # 5. ΚΡΗΤΙΚΟΣ
    "094247924": "ΚΡΗΤΙΚΟΣ",
    
    # 6. ΓΑΛΑΞΙΑΣ (ΠΕΝΤΕ ΑΕ)
    "094116278": "ΓΑΛΑΞΙΑΣ",
    
    # 7. MARKET IN
    "998771189": "MARKET IN",
    "800469072": "MARKET IN",
    
    # 8. BAZAAR
    "094384144": "BAZAAR",
    "094288618": "BAZAAR",
    
    # 9. ΕΓΝΑΤΙΑ
    "094357707": "ΕΓΝΑΤΙΑ",
    
    # 10. ΣΥΝ.ΚΑ ΚΡΗΤΗΣ
    "996722071": "ΣΥΝ.ΚΑ ΚΡΗΤΗΣ",
    "096070396": "ΣΥΝ.ΚΑ ΚΡΗΤΗΣ",
    
    # Other known stores
    "800424460": "LIDL",
    "099326240": "JUMBO",
    "094281307": "MY MARKET",
    "094021972": "THE MART",
    "094150585": "ΜΟΥΣΤΑΚΑΣ",
}

# Keywords to detect store brand from name
STORE_BRAND_KEYWORDS = {
    "ΣΚΛΑΒΕΝΙΤ": "ΣΚΛΑΒΕΝΙΤΗΣ",
    "SKLAVENITIS": "ΣΚΛΑΒΕΝΙΤΗΣ",
    "ΒΑΣΙΛΟΠΟΥΛ": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "ALFA VITA": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "ΑΛΦΑ ΒΗΤΑ": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "A.B.": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "AB ": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "METRO": "METRO",
    "ΜΕΤΡΟ": "METRO",
    "ΜΑΣΟΥΤ": "ΜΑΣΟΥΤΗΣ",
    "MASOUTIS": "ΜΑΣΟΥΤΗΣ",
    "ΚΡΗΤΙΚΟ": "ΚΡΗΤΙΚΟΣ",
    "KRITIKOS": "ΚΡΗΤΙΚΟΣ",
    "ΓΑΛΑΞΙΑ": "ΓΑΛΑΞΙΑΣ",
    "GALAXIAS": "ΓΑΛΑΞΙΑΣ",
    "ΠΕΝΤΕ": "ΓΑΛΑΞΙΑΣ",
    "MARKET IN": "MARKET IN",
    "MARKETIN": "MARKET IN",
    "BAZAAR": "BAZAAR",
    "ΜΠΑΖΑΡ": "BAZAAR",
    "ΕΓΝΑΤΙΑ": "ΕΓΝΑΤΙΑ",
    "EGNATIA": "ΕΓΝΑΤΙΑ",
    "ΣΥΝ.ΚΑ": "ΣΥΝ.ΚΑ ΚΡΗΤΗΣ",
    "ΣΥΝΚΑ": "ΣΥΝ.ΚΑ ΚΡΗΤΗΣ",
    "LIDL": "LIDL",
    "ΛΙΝΤΛ": "LIDL",
    "JUMBO": "JUMBO",
    "ΤΖΑΜΠΟ": "JUMBO",
    "MY MARKET": "MY MARKET",
    "MYMARKET": "MY MARKET",
    "THE MART": "THE MART",
    "THEMART": "THE MART",
    "ΜΟΥΣΤΑΚΑΣ": "ΜΟΥΣΤΑΚΑΣ",
    "MOUSTAKAS": "ΜΟΥΣΤΑΚΑΣ",
}


def get_store_name_from_vat(vat: str, fallback: str = "") -> str:
    """Get clean store name from VAT number."""
    if vat and vat in STORE_VAT_MAPPING:
        return STORE_VAT_MAPPING[vat]
    return fallback

def detect_store_brand(store_name: str) -> str:
    """Detect store brand from store name using keywords."""
    if not store_name:
        return ""
    upper_name = store_name.upper()
    for keyword, brand in STORE_BRAND_KEYWORDS.items():
        if keyword in upper_name:
            return brand
    return store_name

def get_clean_store_name(vat: str, raw_name: str) -> str:
    """Get clean, standardized store name from VAT or raw name."""
    # First try VAT mapping
    if vat:
        clean_vat = vat.strip()
        if clean_vat in STORE_VAT_MAPPING:
            return STORE_VAT_MAPPING[clean_vat]
    
    # Then try brand detection from name
    if raw_name:
        brand = detect_store_brand(raw_name)
        if brand and brand != raw_name:
            return brand
        return raw_name.strip()
    
    return ""
