from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import uuid
import aiohttp
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

# ── Parsers ──

def parse_greek_number(text: str) -> float:
    if not text:
        return 0.0
    text = text.strip().replace('\xa0', '').replace('EUR', '').replace('€', '').strip()
    text = text.replace('.', '').replace(',', '.')
    try:
        return float(text)
    except (ValueError, TypeError):
        return 0.0

async def fetch_html(url: str) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
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
        data["net_total"] = sum(parse_greek_number(str(i.get("pre_discount_value", 0))) - parse_greek_number(str(i.get("discount", 0))) for i in data["items"])

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


def parse_webview_extracted(raw_text: str, items_from_dom: list, store_hint: str, source_url: str) -> dict:
    """Parse data extracted from WebView DOM injection (Epsilon Digital pages)."""
    data = {
        "store_name": store_hint or "",
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
        # Store name: usually first non-empty line or contains known keywords
        if not data["store_name"] and len(line) > 3 and not line.startswith('Α/Α') and not line.startswith('Κωδ'):
            if any(k in line.upper() for k in ['ΑΒ', 'ΒΑΣΙΛΟΠΟΥΛ', 'MARKET', 'BAZAAR', 'Α.Ε', 'Ε.Π.Ε', 'ΣΟΥΠΕΡ', 'ΜΑΡΚΕΤ']):
                data["store_name"] = line
        # VAT
        afm_match = re.search(r'(?:Α\.?Φ\.?Μ\.?|ΑΦΜ)[:\s]*(\d{9})', line)
        if afm_match:
            data["store_vat"] = afm_match.group(1)
        # Date
        date_match = re.search(r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})', line)
        if date_match and not data["date"]:
            data["date"] = date_match.group(1)
        # Receipt number
        if any(k in line for k in ['Αρ. Παραστατ', 'Αριθμός', 'Α/Α', 'Receipt']):
            num_match = re.search(r'[\d]+', line.split(':')[-1] if ':' in line else line)
            if num_match:
                data["receipt_number"] = num_match.group(0)
        # Payment
        if any(k in line for k in ['POS', 'Μετρητ', 'Κάρτα', 'ΠΛΗΡΩΜ']):
            data["payment_method"] = line.strip()

    # Process items from DOM extraction (structured data from JS)
    if items_from_dom:
        for item_raw in items_from_dom:
            code = str(item_raw.get('code', '')).strip()
            desc = str(item_raw.get('description', '')).strip()
            if not desc:
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
        data["total"] = round(sum(i["total_value"] for i in data["items"]), 2)
        data["net_total"] = data["total"]

    # Try to extract total from raw text if it differs
    for line in lines:
        if any(k in line.upper() for k in ['ΤΕΛΙΚ', 'ΣΥΝΟΛ', 'TOTAL', 'ΠΛΗΡΩΤ']):
            total_match = re.search(r'([\d]+[,.][\d]{2})', line)
            if total_match:
                try:
                    parsed_total = float(total_match.group(1).replace(',', '.'))
                    if parsed_total > 0:
                        data["total"] = parsed_total
                except ValueError:
                    pass

    return data


# ── API Routes ──

@api_router.get("/")
async def root():
    return {"message": "GroceryTracker API", "version": "1.0.0"}

@api_router.post("/devices/register")
async def register_device(input: DeviceRegister):
    existing = await db.devices.find_one({"device_id": input.device_id}, {"_id": 0})
    if existing:
        await db.devices.update_one({"device_id": input.device_id}, {"$set": {"language": input.language, "last_seen": datetime.now(timezone.utc).isoformat()}})
        return {"status": "updated", "device_id": input.device_id}
    doc = {"device_id": input.device_id, "language": input.language, "created_at": datetime.now(timezone.utc).isoformat(), "last_seen": datetime.now(timezone.utc).isoformat()}
    await db.devices.insert_one(doc)
    return {"status": "registered", "device_id": input.device_id}


@api_router.post("/receipts/import-url")
async def import_receipt_from_url(input: URLImportInput):
    url = input.url.strip()
    provider = detect_provider(url)

    if provider == 'epsilon_digital':
        # Check for duplicates even for epsilon digital
        if not input.force_import:
            existing = await db.receipts.find_one({"source_url": url, "device_id": input.device_id})
            if existing:
                existing.pop("_id", None)
                return {
                    "status": "duplicate",
                    "message": "Αυτή η απόδειξη έχει ήδη εισαχθεί.",
                    "existing_receipt": existing,
                    "url": url
                }
        return {"status": "webview_required", "url": url, "message": "This receipt requires WebView import. Opening in-app browser..."}

    if provider == 'unknown':
        raise HTTPException(status_code=400, detail="Unknown receipt provider. Supported: e-invoicing.gr, einvoice.impact.gr")

    # Check for duplicate receipt by URL
    if not input.force_import:
        existing = await db.receipts.find_one({"source_url": url, "device_id": input.device_id})
        if existing:
            existing.pop("_id", None)
            return {
                "status": "duplicate",
                "message": "Αυτή η απόδειξη έχει ήδη εισαχθεί.",
                "existing_receipt": existing,
                "url": url
            }

    if provider == 'entersoft':
        html = await fetch_entersoft_invoice(url)
        receipt_data = parse_entersoft(html, url)
    elif provider == 'impact':
        html = await fetch_html(url)
        receipt_data = parse_impact(html, url)
    else:
        raise HTTPException(status_code=400, detail="Parser not available for this provider")

    if not receipt_data["items"]:
        raise HTTPException(status_code=400, detail="Could not parse any products from this receipt")

    receipt = ReceiptData(device_id=input.device_id, **receipt_data)
    doc = receipt.dict()
    await db.receipts.insert_one(doc)

    # Index products
    for item in receipt_data["items"]:
        await db.products.update_one(
            {"description": item["description"], "store_name": receipt_data["store_name"]},
            {"$set": {
                "description": item["description"],
                "code": item["code"],
                "store_name": receipt_data["store_name"],
                "store_vat": receipt_data["store_vat"],
                "last_price": item["total_value"],
                "last_unit_price": item["unit_price"],
                "last_date": receipt_data["date"],
                "unit": item["unit"],
                "vat_percent": item["vat_percent"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"price_history": {"price": item["total_value"], "unit_price": item["unit_price"], "date": receipt_data["date"], "quantity": item["quantity"], "receipt_id": doc["id"]}}},
            upsert=True
        )

    doc.pop("_id", None)
    return {"status": "success", "receipt": doc}


@api_router.post("/receipts/import-xml")
async def import_receipt_from_xml(device_id: str = Form(...), file: UploadFile = File(...)):
    content = await file.read()
    xml_str = content.decode('utf-8')
    receipt_data = parse_mydata_xml(xml_str)

    if not receipt_data["items"]:
        raise HTTPException(status_code=400, detail="Could not parse any products from this XML")

    receipt = ReceiptData(device_id=device_id, **receipt_data)
    doc = receipt.dict()
    await db.receipts.insert_one(doc)

    for item in receipt_data["items"]:
        await db.products.update_one(
            {"description": item["description"], "store_name": receipt_data["store_name"]},
            {"$set": {
                "description": item["description"],
                "code": item["code"],
                "store_name": receipt_data["store_name"],
                "store_vat": receipt_data["store_vat"],
                "last_price": item["total_value"],
                "last_unit_price": item["unit_price"],
                "last_date": receipt_data["date"],
                "unit": item["unit"],
                "vat_percent": item["vat_percent"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"price_history": {"price": item["total_value"], "unit_price": item["unit_price"], "date": receipt_data["date"], "quantity": item["quantity"], "receipt_id": doc["id"]}}},
            upsert=True
        )

    doc.pop("_id", None)
    return {"status": "success", "receipt": doc}


@api_router.post("/receipts/import-webview")
async def import_receipt_from_webview(input: WebViewExtractedData):
    """Import receipt from WebView DOM extraction (Epsilon Digital stores)."""
    receipt_data = parse_webview_extracted(
        raw_text=input.raw_text,
        items_from_dom=input.items,
        store_hint=input.store_name,
        source_url=input.url
    )

    if not receipt_data["items"]:
        raise HTTPException(status_code=400, detail="Could not parse any products from the extracted data")

    receipt = ReceiptData(device_id=input.device_id, **receipt_data)
    doc = receipt.dict()
    await db.receipts.insert_one(doc)

    for item in receipt_data["items"]:
        await db.products.update_one(
            {"description": item["description"], "store_name": receipt_data["store_name"]},
            {"$set": {
                "description": item["description"],
                "code": item["code"],
                "store_name": receipt_data["store_name"],
                "store_vat": receipt_data["store_vat"],
                "last_price": item["total_value"],
                "last_unit_price": item["unit_price"],
                "last_date": receipt_data["date"],
                "unit": item["unit"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"price_history": {"price": item["total_value"], "unit_price": item["unit_price"], "date": receipt_data["date"], "quantity": item["quantity"], "receipt_id": doc["id"]}}},
            upsert=True
        )

    doc.pop("_id", None)
    return {"status": "success", "receipt": doc}


@api_router.post("/receipts/manual")
async def create_manual_receipt(input: ManualReceiptInput):
    receipt_data = {
        "store_name": input.store_name,
        "store_address": "",
        "store_vat": "",
        "receipt_number": "",
        "date": input.date,
        "payment_method": input.payment_method,
        "items": [item.dict() for item in input.items],
        "subtotal": input.total,
        "discount_total": 0.0,
        "total": input.total,
        "vat_total": 0.0,
        "net_total": input.total,
        "source_url": "",
        "source_type": "manual",
        "provider": "Manual Entry"
    }
    receipt = ReceiptData(device_id=input.device_id, **receipt_data)
    doc = receipt.dict()
    await db.receipts.insert_one(doc)

    for item in input.items:
        await db.products.update_one(
            {"description": item.description, "store_name": input.store_name},
            {"$set": {
                "description": item.description,
                "code": item.code,
                "store_name": input.store_name,
                "last_price": item.total_value,
                "last_unit_price": item.unit_price,
                "last_date": input.date,
                "unit": item.unit,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"price_history": {"price": item.total_value, "unit_price": item.unit_price, "date": input.date, "quantity": item.quantity, "receipt_id": doc["id"]}}},
            upsert=True
        )

    doc.pop("_id", None)
    return {"status": "success", "receipt": doc}


@api_router.get("/receipts")
async def get_receipts(device_id: str = Query(...), skip: int = 0, limit: int = 50, search: str = ""):
    query = {"device_id": device_id}
    if search:
        query["$or"] = [
            {"store_name": {"$regex": search, "$options": "i"}},
            {"items.description": {"$regex": search, "$options": "i"}}
        ]
    cursor = db.receipts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    receipts = await cursor.to_list(limit)
    total = await db.receipts.count_documents(query)
    return {"receipts": receipts, "total": total}


@api_router.get("/receipts/{receipt_id}")
async def get_receipt(receipt_id: str):
    receipt = await db.receipts.find_one({"id": receipt_id}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt


@api_router.delete("/receipts/{receipt_id}")
async def delete_receipt(receipt_id: str):
    result = await db.receipts.delete_one({"id": receipt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {"status": "deleted"}


@api_router.get("/products/search")
async def search_products(q: str = Query(..., min_length=2), device_id: str = Query("")):
    query = {"description": {"$regex": q, "$options": "i"}}
    products = await db.products.find(query, {"_id": 0}).limit(50).to_list(50)
    return {"products": products}


@api_router.get("/products/compare")
async def compare_product_prices(q: str = Query(..., min_length=2)):
    products = await db.products.find(
        {"description": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).to_list(100)

    stores = {}
    for p in products:
        store = p.get("store_name", "Unknown")
        if store not in stores:
            stores[store] = []
        stores[store].append({
            "description": p["description"],
            "last_price": p.get("last_price", 0),
            "last_unit_price": p.get("last_unit_price", 0),
            "last_date": p.get("last_date", ""),
            "price_history": p.get("price_history", [])
        })

    return {"query": q, "stores": stores, "total_products": len(products)}


@api_router.get("/stats")
async def get_stats(device_id: str = Query(...)):
    total_receipts = await db.receipts.count_documents({"device_id": device_id})
    total_products = await db.products.count_documents({})

    pipeline = [
        {"$match": {"device_id": device_id}},
        {"$group": {"_id": None, "total_spent": {"$sum": "$total"}, "avg_receipt": {"$avg": "$total"}}}
    ]
    result = await db.receipts.aggregate(pipeline).to_list(1)
    total_spent = result[0]["total_spent"] if result else 0
    avg_receipt = result[0]["avg_receipt"] if result else 0

    store_pipeline = [
        {"$match": {"device_id": device_id}},
        {"$group": {"_id": "$store_name", "count": {"$sum": 1}, "total": {"$sum": "$total"}}},
        {"$sort": {"count": -1}}
    ]
    stores = await db.receipts.aggregate(store_pipeline).to_list(20)

    recent = await db.receipts.find({"device_id": device_id}, {"_id": 0, "id": 1, "store_name": 1, "total": 1, "date": 1, "created_at": 1}).sort("created_at", -1).limit(5).to_list(5)

    return {
        "total_receipts": total_receipts,
        "total_products": total_products,
        "total_spent": round(total_spent, 2),
        "avg_receipt": round(avg_receipt, 2),
        "stores": [{"name": s["_id"], "count": s["count"], "total": round(s["total"], 2)} for s in stores],
        "recent_receipts": recent
    }


@api_router.get("/backup/export")
async def export_data(device_id: str = Query(...)):
    receipts = await db.receipts.find({"device_id": device_id}, {"_id": 0}).to_list(10000)
    return {
        "device_id": device_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "total_receipts": len(receipts),
        "receipts": receipts
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
