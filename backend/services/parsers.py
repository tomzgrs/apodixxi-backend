        return data
    return data

# ── Models ──

class ProductItem(BaseModel):
    code: str = ""
    description: str = ""
    unit: str = ""
    quantity: float = 1.0
    unit_price: float = 0.0
    pre_discount_value: float = 0.0
    discount: float = 0.0
    vat_percent: float = 0.0
    total_value: float = 0.0

class ReceiptData(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str = ""
    store_name: str = ""
    store_address: str = ""
    store_vat: str = ""
    receipt_number: str = ""
    date: str = ""
    payment_method: str = ""
    items: List[ProductItem] = []
    subtotal: float = 0.0
    discount_total: float = 0.0
    total: float = 0.0
    vat_total: float = 0.0
    net_total: float = 0.0
    source_url: str = ""
    source_type: str = ""  # entersoft, impact, xml, manual
    provider: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ManualReceiptInput(BaseModel):
    device_id: str
    store_name: str
    date: str
    items: List[ProductItem]
    total: float
    payment_method: str = ""

class URLImportInput(BaseModel):
    device_id: str
    url: str
    force_import: bool = False  # If true, import even if duplicate

class DeviceRegister(BaseModel):
    device_id: str
    language: str = "el"

class WebViewExtractedData(BaseModel):
    device_id: str
    url: str = ""
    raw_text: str = ""
    items: List[dict] = []
    store_name: str = ""
    found_final_total: float = 0.0  # Final total with VAT found in raw text

# ── Parsers ──

# VAT to Store Name mapping - Major Greek supermarket chains
STORE_VAT_MAPPING = {
    # 1. ΣΚΛΑΒΕΝΙΤΗΣ
    "800764388": "ΣΚΛΑΒΕΝΙΤΗΣ",
    
    # 2. ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ
    "094025817": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",
    "094014249": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",  # Alternative VAT
    "094059506": "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ",  # Alternative VAT
    
    # 3. METRO
    "094062259": "METRO",
    
    # 4. ΜΑΣΟΥΤΗΣ
    "094063140": "ΜΑΣΟΥΤΗΣ",
    "094063169": "ΜΑΣΟΥΤΗΣ",  # Alternative VAT
    
    # 5. ΚΡΗΤΙΚΟΣ
    "094247924": "ΚΡΗΤΙΚΟΣ",
    
    # 6. ΓΑΛΑΞΙΑΣ (ΠΕΝΤΕ ΑΕ)
    "094116278": "ΓΑΛΑΞΙΑΣ",
    
    # 7. MARKET IN
    "998771189": "MARKET IN",
    "800469072": "MARKET IN",  # Alternative VAT
    
    # 8. BAZAAR
    "094384144": "BAZAAR",
    "094288618": "BAZAAR",  # Alternative VAT
    
    # 9. ΕΓΝΑΤΙΑ
    "094357707": "ΕΓΝΑΤΙΑ",
    
    # 10. ΣΥΝ.ΚΑ ΚΡΗΤΗΣ
    "996722071": "ΣΥΝ.ΚΑ ΚΡΗΤΗΣ",
    "096070396": "ΣΥΝ.ΚΑ ΚΡΗΤΗΣ",
    
    # Other known stores
    "800424460": "LIDL",
    "099326240": "JUMBO",
    "094281307": "MY MARKET",
    
    # THE MART
    "094021972": "THE MART",
    
    # ΜΟΥΣΤΑΚΑΣ (Toy Store)
    "094150585": "ΜΟΥΣΤΑΚΑΣ",
}

# Keywords to detect store brand from name (for franchises with different VAT)
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
    """Detect store brand from name using keywords (for franchises)."""
    if not store_name:
        return ""
    name_upper = store_name.upper()
    for keyword, brand in STORE_BRAND_KEYWORDS.items():
        if keyword in name_upper:
            return brand
    return ""

def get_clean_store_name(vat: str, raw_name: str) -> str:
    """
    Get the cleanest store name possible:
    1. First try VAT mapping (most reliable)
    2. Then try keyword detection from name (for franchises)
    3. Fallback to raw name
    """
    # Try VAT mapping first
    if vat:
        mapped = get_store_name_from_vat(vat)
        if mapped:
            return mapped
    
    # Try keyword detection for franchises
    if raw_name:
        brand = detect_store_brand(raw_name)
        if brand:
            return brand
    
    # Fallback to raw name (cleaned up)
    if raw_name:
        # Remove common suffixes like ΑΕ, ΑΕΒΕ, etc.
        cleaned = raw_name.strip()
        for suffix in [" ΑΝΩΝΥΜΗ ΕΤΑΙΡΕΙΑ", " ΜΟΝΟΠΡΟΣΩΠΗ", " ΑΕΒΕ", " Α.Ε.", " ΑΕ", " ΕΠΕ", " ΙΚΕ"]:
            if cleaned.upper().endswith(suffix):
                cleaned = cleaned[:-len(suffix)].strip()
        return cleaned
    
    return "Άγνωστο Κατάστημα"

def parse_greek_number(text: str) -> float:
    """Parse Greek-formatted numbers (uses comma as decimal separator)."""
    if not text:
        return 0.0
    text = text.strip().replace('\xa0', '').replace('EUR', '').replace('€', '').strip()
    
    # Handle different number formats:
    # Greek: 1.234,56 or 1234,56
    # English: 1,234.56 or 1234.56
    
    # Count dots and commas
    dots = text.count('.')
    commas = text.count(',')
    
    if commas == 1 and dots == 0:
        # Format: 1234,56 - comma is decimal
        text = text.replace(',', '.')
    elif dots == 1 and commas == 0:
        # Format: 1234.56 - already correct
        pass
    elif dots >= 1 and commas == 1:
        # Format: 1.234,56 - dot is thousand separator, comma is decimal
        text = text.replace('.', '').replace(',', '.')
    elif commas >= 1 and dots == 1:
        # Format: 1,234.56 - comma is thousand separator, dot is decimal
        text = text.replace(',', '')
    else:
        # Just try to parse, removing non-numeric except decimal point
        text = text.replace('.', '').replace(',', '.')
    
    try:
        return float(text)
    except (ValueError, TypeError):
        return 0.0

async def fetch_html(url: str) -> str:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
    }
    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=60), ssl=False) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=400, detail=f"Could not fetch URL: HTTP {resp.status}")
            return await resp.text()

async def fetch_entersoft_invoice(url: str) -> str:
    """Fetch Entersoft invoice by first getting the page, extracting iframe src, then fetching iframe content."""
    html = await fetch_html(url)
    soup = BeautifulSoup(html, 'lxml')
    iframe = soup.find('iframe', id='iframeContent')
    if not iframe or not iframe.get('src'):
        raise HTTPException(status_code=400, detail="Could not find invoice iframe in page")
    iframe_src = iframe['src']
    if iframe_src.startswith('/'):
        iframe_src = 'https://e-invoicing.gr' + iframe_src
    return await fetch_html(iframe_src)

def parse_entersoft(html: str, source_url: str) -> dict:
    soup = BeautifulSoup(html, 'lxml')
    data = {
        "store_name": "",
        "store_address": "",
        "store_vat": "",
        "receipt_number": "",
        "date": "",
        "payment_method": "",
        "items": [],
        "subtotal": 0.0,
        "discount_total": 0.0,
        "total": 0.0,
        "vat_total": 0.0,
        "net_total": 0.0,
        "source_url": source_url,
        "source_type": "entersoft",
        "provider": "Entersoft"
    }
    header = soup.find('div', class_='BoldBlueHeader fontSize12pt')
    if header:
        data["store_name"] = header.get_text(strip=True)

    for div in soup.find_all('div', class_='fontSize8pt'):
        txt = div.get_text(strip=True)
        if 'Α.Φ.Μ' in txt:
            match = re.search(r'Α\.Φ\.Μ:\s*(\d+)', txt)
            if match:
                data["store_vat"] = match.group(1)
            if ',' in txt and 'Α.Φ.Μ' in txt:
                addr_part = txt.split('Α.Φ.Μ')[0].strip().rstrip(',')
                if not data["store_address"]:
                    data["store_address"] = addr_part
        elif txt.startswith('Αρ. Παραστατικού'):
            data["receipt_number"] = txt.replace('Αρ. Παραστατικού:', '').strip()
        elif txt.startswith('Ημ/νία έκδοσης'):
            data["date"] = txt.replace('Ημ/νία έκδοσης:', '').strip()

    # Try address from a specific div
    addr_divs = soup.find_all('div', class_='fontSize8pt')
    for d in addr_divs:
        t = d.get_text(strip=True)
        if t and not t.startswith('Α.Φ.Μ') and not t.startswith('Αρ.') and not t.startswith('Ημ/') and not t.startswith('Email') and not t.startswith('Πάροχος') and not t.startswith('Url') and not t.startswith('Άδεια') and not t.startswith('UID') and not t.startswith('M.AR') and not t.startswith('Auth') and t and ',' in t and any(c.isdigit() for c in t):
            if not data["store_address"] or len(t) < len(data["store_address"]):
                data["store_address"] = t
                break

    # Payment
    for div in soup.find_all('div', class_='fontSize8pt'):
        txt = div.get_text(strip=True)
        if txt in ['POS / e-POS', 'Μετρητά', 'Κάρτα']:
            data["payment_method"] = txt
            break

    table = soup.find('table', class_='table')
    if table:
        rows = table.find('tbody')
        if rows:
            for row in rows.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) >= 9:
                    item = {
                        "code": cells[0].get_text(strip=True),
                        "description": cells[1].get_text(strip=True),
                        "unit": cells[2].get_text(strip=True),
                        "quantity": parse_greek_number(cells[3].get_text(strip=True)),
                        "unit_price": parse_greek_number(cells[4].get_text(strip=True)),
                        "pre_discount_value": parse_greek_number(cells[5].get_text(strip=True)),
                        "discount": parse_greek_number(cells[6].get_text(strip=True)),
                        "vat_percent": parse_greek_number(cells[7].get_text(strip=True).replace('%', '')),
                        "total_value": parse_greek_number(cells[8].get_text(strip=True)),
                    }
                    data["items"].append(item)

    # Totals
    for div in soup.find_all('div', class_='fontSize8pt'):
        txt = div.get_text(strip=True)
        if 'Αξία προ έκπτωσης' in txt:
            sibling = div.find_next_sibling('div')
            if sibling:
                data["subtotal"] = parse_greek_number(sibling.get_text(strip=True))
        elif txt.strip() == 'Έκπτωση':
            sibling = div.find_next_sibling('div')
            if sibling:
                data["discount_total"] = parse_greek_number(sibling.get_text(strip=True))

    for div in soup.find_all('div', class_='backgrey'):
        txt = div.get_text(strip=True)
        if 'EUR' in txt and any(c.isdigit() for c in txt):
            val = parse_greek_number(txt)
            if val > 0:
                data["total"] = val
                break

    # Try ΤΕΛΙΚΗ ΑΞΙΑ
    for div in soup.find_all('div'):
        txt = div.get_text(strip=True)
        if 'ΤΕΛΙΚΗ ΑΞΙΑ' in txt or 'ΤΕΛΙΚΗ' in txt:
            next_div = div.find_next_sibling('div')
            if next_div:
                val = parse_greek_number(next_div.get_text(strip=True))
                if val > 0:
                    data["total"] = val

    for div in soup.find_all('div', class_='fontSize6pt'):
        txt = div.get_text(strip=True)
        if 'Καθαρή Αξία' in txt:
            sibling = div.find_next_sibling('div')
            if sibling:
                data["net_total"] = parse_greek_number(sibling.get_text(strip=True))
        elif 'Φ.Π.Α' in txt and 'ΑΝΑΛΥΣΗ' not in txt:
            sibling = div.find_next_sibling('div')
            if sibling:
                data["vat_total"] = parse_greek_number(sibling.get_text(strip=True))

    if not data["total"] and data["items"]:
        data["total"] = sum(i["total_value"] for i in data["items"])

    # Use clean store name (VAT mapping or keyword detection)
    data["store_name"] = get_clean_store_name(data["store_vat"], data["store_name"])

    return data


def parse_impact(html: str, source_url: str) -> dict:
    soup = BeautifulSoup(html, 'lxml')
    data = {
        "store_name": "",
        "store_address": "",
        "store_vat": "",
        "receipt_number": "",
        "date": "",
        "payment_method": "",
        "items": [],
        "subtotal": 0.0,
        "discount_total": 0.0,
        "total": 0.0,
        "vat_total": 0.0,
        "net_total": 0.0,
        "source_url": source_url,
        "source_type": "impact",
        "provider": "Impact/Entersoft One"
    }

    # Store name from issuer
    for span in soup.find_all('span', class_='value'):
        parent = span.find_parent('span', class_='field')
        if parent and 'field-IssuerName' in parent.get('class', []):
            data["store_name"] = span.get_text(strip=True)
        elif parent and 'field-IssuerVATNumber' in parent.get('class', []):
            data["store_vat"] = span.get_text(strip=True)

    # If no issuer name, try other patterns
    if not data["store_name"]:
        for span in soup.find_all('span', class_='field'):
            classes = span.get('class', [])
            if 'field-RegisteredName' in classes:
                val = span.find('span', class_='value')
                if val:
                    name = val.get_text(strip=True)
                    if name and name != 'Πελάτης Λιανικής':
                        data["store_name"] = name

    # Receipt number
    for span in soup.find_all('span', class_='field'):
        classes = span.get('class', [])
        if 'field-IssuerFormatedInvoiceSeriesNumber' in classes:
            val = span.find('span', class_='value')
            if val:
                data["receipt_number"] = val.get_text(strip=True)
        elif 'field-DateIssued' in classes:
            val = span.find('span', class_='value')
            if val:
                data["date"] = val.get_text(strip=True)

    # Items from table
    table = soup.find('table', class_='table')
    if table:
        tbody = table.find('tbody')
        if tbody:
            for row in tbody.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) >= 7:
                    code_val = ""
                    desc_val = ""
                    qty_val = 0.0
                    unit_val = ""
                    price_val = 0.0
                    discount_val = 0.0
                    net_val = 0.0
                    vat_cat = 0.0
                    vat_total = 0.0
                    total_val = 0.0

                    for cell in cells:
                        header = cell.get('data-header', '')
                        val_span = cell.find('span', class_='value')
                        val_text = val_span.get_text(strip=True) if val_span else cell.get_text(strip=True)

                        if 'Κωδικός' in header:
                            code_val = val_text
                        elif 'Περιγραφή' in header:
                            desc_val = val_text
                        elif 'Ποσότητα' in header:
                            qty_val = parse_greek_number(val_text)
                        elif 'M.M.' in header or 'Μ.Μ.' in header:
                            unit_val = val_text
                        elif 'Τιμή' in header:
                            price_val = parse_greek_number(val_text)
                        elif 'Έκπτ' in header:
                            discount_val = parse_greek_number(val_text)
                        elif 'Καθαρή' in header:
                            net_val = parse_greek_number(val_text)
                        elif 'Κατηγορία' in header and 'Φ.Π.Α' in header:
                            vat_cat = parse_greek_number(val_text)
                        elif 'Σύνολο Φ.Π.Α' in header:
                            vat_total = parse_greek_number(val_text)
                        elif 'Τελικό' in header:
                            total_val = parse_greek_number(val_text)

                    if desc_val:
                        vat_pct = {1: 24, 2: 13, 3: 6, 4: 17, 5: 9}.get(int(vat_cat), 0) if vat_cat else 0
                        item = {
                            "code": code_val,
                            "description": desc_val,
                            "unit": unit_val,
                            "quantity": qty_val if qty_val else 1.0,
                            "unit_price": price_val,
                            "pre_discount_value": net_val + vat_total if net_val else total_val,
                            "discount": discount_val,
                            "vat_percent": float(vat_pct),
                            "total_value": total_val,
                        }
                        data["items"].append(item)

    if data["items"]:
        data["total"] = sum(i["total_value"] for i in data["items"])
        # Calculate net_total properly (don't multiply by 100)
        net_sum = 0.0
        for i in data["items"]:
            pre_disc = i.get("pre_discount_value", 0) or 0
            disc = i.get("discount", 0) or 0
            if isinstance(pre_disc, str):
                pre_disc = parse_greek_number(pre_disc)
            if isinstance(disc, str):
                disc = parse_greek_number(disc)
            net_sum += (pre_disc - disc)
        data["net_total"] = round(net_sum, 2)

    # Use clean store name (VAT mapping or keyword detection)
    data["store_name"] = get_clean_store_name(data["store_vat"], data["store_name"])

    return data


def parse_mydata_xml(xml_content: str) -> dict:
    data = {
        "store_name": "",
        "store_address": "",
        "store_vat": "",
        "receipt_number": "",
        "date": "",
        "payment_method": "",
        "items": [],
        "subtotal": 0.0,
        "discount_total": 0.0,
        "total": 0.0,
        "vat_total": 0.0,
        "net_total": 0.0,
        "source_url": "",
        "source_type": "xml",
        "provider": "Epsilon Digital (myData XML)"
    }

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError:
        raise HTTPException(status_code=400, detail="Invalid XML format")

    ns = {}
    for event, elem in ET.iterparse(__import__('io').StringIO(xml_content), events=['start-ns']):
        ns[elem[0]] = elem[1]

    def find_text(element, paths):
        for path in paths:
            found = element.find(path, ns) if ns else element.find(path)
            if found is not None and found.text:
                return found.text.strip()
        return ""

    # Try common myData XML structures
    issuer = root.find('.//{*}issuer') or root.find('.//issuer')
    if issuer is not None:
        data["store_vat"] = find_text(issuer, ['{*}vatNumber', 'vatNumber', '{*}afm', 'afm'])
        data["store_name"] = find_text(issuer, ['{*}name', 'name', '{*}registeredName', 'registeredName'])

    header = root.find('.//{*}invoiceHeader') or root.find('.//invoiceHeader')
    if header is not None:
        data["receipt_number"] = find_text(header, ['{*}invoiceSerialNumber', 'invoiceSerialNumber', '{*}aa', 'aa'])
        data["date"] = find_text(header, ['{*}issueDate', 'issueDate'])

    for detail in root.findall('.//{*}invoiceDetails') or root.findall('.//invoiceDetails') or root.findall('.//{*}InvoiceLine') or root.findall('.//InvoiceLine'):
        desc = find_text(detail, ['{*}itemDescr', 'itemDescr', '{*}description', 'description', '{*}name', 'name'])
        if not desc:
            continue
        qty_text = find_text(detail, ['{*}quantity', 'quantity'])
        net_text = find_text(detail, ['{*}netValue', 'netValue'])
        vat_text = find_text(detail, ['{*}vatAmount', 'vatAmount'])
        code_text = find_text(detail, ['{*}itemCode', 'itemCode', '{*}code', 'code'])

        qty = float(qty_text.replace(',', '.')) if qty_text else 1.0
        net_val = float(net_text.replace(',', '.')) if net_text else 0.0
        vat_val = float(vat_text.replace(',', '.')) if vat_text else 0.0
        total = net_val + vat_val

        item = {
            "code": code_text,
            "description": desc,
            "unit": find_text(detail, ['{*}measurementUnit', 'measurementUnit']) or "ΤΕΜ",
            "quantity": qty,
            "unit_price": round(net_val / qty, 5) if qty else net_val,
            "pre_discount_value": net_val,
            "discount": 0.0,
            "vat_percent": round((vat_val / net_val) * 100, 0) if net_val else 0.0,
            "total_value": total,
        }
        data["items"].append(item)

    if data["items"]:
        data["total"] = round(sum(i["total_value"] for i in data["items"]), 2)
        data["net_total"] = round(sum(i["pre_discount_value"] for i in data["items"]), 2)
        data["vat_total"] = round(data["total"] - data["net_total"], 2)

    summary = root.find('.//{*}invoiceSummary') or root.find('.//invoiceSummary')
    if summary is not None:
        t = find_text(summary, ['{*}totalGrossValue', 'totalGrossValue'])
        if t:
            data["total"] = float(t.replace(',', '.'))
        n = find_text(summary, ['{*}totalNetValue', 'totalNetValue'])
        if n:
            data["net_total"] = float(n.replace(',', '.'))
        v = find_text(summary, ['{*}totalVatAmount', 'totalVatAmount'])
        if v:
            data["vat_total"] = float(v.replace(',', '.'))

    return data


def detect_provider(url: str) -> str:
    if 'e-invoicing.gr' in url:
        return 'entersoft'
    elif 'einvoice.impact.gr' in url:
        return 'impact'
    elif 'epsilondigital' in url or 'epsilonnet.gr' in url:
        return 'epsilon_digital'
    return 'unknown'


def parse_webview_extracted(raw_text: str, items_from_dom: list, store_hint: str, source_url: str, found_final_total: float = 0.0) -> dict:
    """Parse data extracted from WebView DOM injection (Epsilon Digital pages)."""
    
    # Determine store name from URL if not provided
    detected_store = store_hint or ""
    if source_url:
        url_lower = source_url.lower()
        if 'marketin' in url_lower or 'market-in' in url_lower:
            detected_store = "MARKET IN"
        elif 'abmarket' in url_lower or 'epsilondigital-ab' in url_lower:
            detected_store = "ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ"
        elif 'bazaar' in url_lower:
            detected_store = "BAZAAR"
        elif 'sklavenitis' in url_lower:
            detected_store = "ΣΚΛΑΒΕΝΙΤΗΣ"
    
    data = {
        "store_name": detected_store,
        "store_address": "",
        "store_vat": "",
        "receipt_number": "",
        "date": "",
        "payment_method": "",
        "items": [],
        "subtotal": 0.0,
        "discount_total": 0.0,
        "total": 0.0,
        "vat_total": 0.0,
        "net_total": 0.0,
        "source_url": source_url,
        "source_type": "webview",
        "provider": "Epsilon Digital (WebView)"
    }

    lines = raw_text.split('\n') if raw_text else []

    # Extract store info from raw text
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # VAT
        afm_match = re.search(r'(?:Α\.?Φ\.?Μ\.?|ΑΦΜ)[:\s]*(\d{9})', line)
        if afm_match:
            data["store_vat"] = afm_match.group(1)
        # Date
        date_match = re.search(r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})', line)
        if date_match and not data["date"]:
            data["date"] = date_match.group(1)
        # Receipt number
        if any(k in line for k in ['Αρ. Παραστατ', 'Αριθμός', 'Αρ. Τιμολ', 'Receipt']):
            num_match = re.search(r'[\d]+', line.split(':')[-1] if ':' in line else line)
            if num_match:
                data["receipt_number"] = num_match.group(0)
        # Payment
        if any(k in line for k in ['POS', 'Μετρητ', 'Κάρτα', 'ΠΛΗΡΩΜ']):
            data["payment_method"] = line.strip()

    # Use clean store name (VAT mapping or keyword detection)
    data["store_name"] = get_clean_store_name(data["store_vat"], data["store_name"])

    # Process items from DOM extraction (structured data from JS)
    # Helper function to check if this is a total row
    def is_total_row(text):
        if not text:
            return False
        t = text.upper().strip()
        return t in ['ΣΥΝΟΛΟ', 'ΣΥΝΟΛΑ', 'ΤΕΛΙΚΟ', 'TOTAL', 'ΠΛΗΡΩΤΕΟ'] or \
               (len(t) < 8 and re.match(r'^\d+[,.]?\d*$', t))

    # Helper function to check if this is a payment method row
    def is_payment_row(text):
        if not text:
            return False
        t = text.upper().strip()
        payment_keywords = ['EFT-POS', 'EFT POS', 'EFTPOS', 'POS', 'ΜΕΤΡΗΤΑ', 'ΚΑΡΤΑ',
                          'CASH', 'CARD', 'ΠΛΗΡΩΜ', 'VISA', 'MASTERCARD', 'CREDIT',
                          'DEBIT', 'PAYMENT', 'ΑΠΟΔ', 'ΡΕΣΤΑ', 'CHANGE']
        return any(kw in t for kw in payment_keywords)

    if items_from_dom:
        for item_raw in items_from_dom:
            code = str(item_raw.get('code', '')).strip()
            desc = str(item_raw.get('description', '')).strip()
            if not desc:
                continue
            
            # Skip total rows and payment rows
            if is_total_row(desc) or is_total_row(code):
                continue
            if is_payment_row(desc) or is_payment_row(code):
                continue

            qty_str = str(item_raw.get('quantity', '1')).replace(',', '.')
            price_str = str(item_raw.get('unit_price', item_raw.get('total', '0'))).replace(',', '.').replace('€', '')
            total_str = str(item_raw.get('total', '0')).replace(',', '.').replace('€', '')

            try:
                qty = float(qty_str) if qty_str else 1.0
            except ValueError:
                qty = 1.0
            try:
                total_val = float(total_str) if total_str else 0.0
            except ValueError:
                total_val = 0.0
            try:
                unit_price = float(price_str) if price_str else (total_val / qty if qty else total_val)
            except ValueError:
                unit_price = total_val / qty if qty else total_val

            item = {
                "code": code,
                "description": desc,
                "unit": str(item_raw.get('unit', 'ΤΕΜ')).strip() or 'ΤΕΜ',
                "quantity": qty,
                "unit_price": round(unit_price, 5),
                "pre_discount_value": round(total_val, 2),
                "discount": 0.0,
                "vat_percent": 0.0,
                "total_value": round(total_val, 2),
            }
            data["items"].append(item)

    # If no items from DOM, try parsing raw text for tab/space-separated product lines
    if not data["items"] and raw_text:
        for line in lines:
            parts = re.split(r'\t+', line.strip())
            if len(parts) >= 4:
                # Try: code, description, qty, price pattern
                possible_code = parts[0].strip()
                if possible_code and re.match(r'^\d+$', possible_code):
                    desc = parts[1].strip()
                    try:
                        total_val = float(parts[-1].replace(',', '.').replace('€', ''))
                    except ValueError:
                        continue
                    item = {
                        "code": possible_code,
                        "description": desc,
                        "unit": "ΤΕΜ",
                        "quantity": 1.0,
                        "unit_price": total_val,
                        "pre_discount_value": total_val,
                        "discount": 0.0,
                        "vat_percent": 0.0,
                        "total_value": total_val,
                    }
                    data["items"].append(item)

    if data["items"]:
        calculated_total = round(sum(i["total_value"] for i in data["items"]), 2)
        data["net_total"] = calculated_total
        
        # Use found_final_total only if it's provided and reasonably close to calculated
        # (within 20% tolerance for VAT differences)
        if found_final_total > 0:
            # If found_final_total is close to calculated, use calculated (more accurate)
            diff = abs(found_final_total - calculated_total)
            if diff <= calculated_total * 0.25:  # 25% tolerance
                data["total"] = calculated_total
            elif found_final_total >= calculated_total:
                # Only use found_final_total if it's larger (includes VAT we didn't capture)
                data["total"] = found_final_total
            else:
                data["total"] = calculated_total
        else:
            data["total"] = calculated_total

    # For Epsilon Digital, trust the calculated total from items more than raw text parsing
    # because raw text may contain confusing numbers (e.g., VAT totals, payment amounts)
    # Skip the additional total parsing from raw text

    return data


# ── API Routes ──

