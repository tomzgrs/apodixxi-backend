"""Receipt routes for managing receipts and products."""
import uuid
import aiohttp
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Form, UploadFile, File
from pydantic import BaseModel, Field
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

from ..config import db, logger

router = APIRouter(prefix="/receipts", tags=["Receipts"])

# ============ MODELS ============

class ProductItem(BaseModel):
    name: str = ""
    description: str = ""
    quantity: float = 1.0
    unit_price: float = 0.0
    total_price: float = 0.0
    total_value: float = 0.0
    vat_rate: float = 0.0
    vat_amount: float = 0.0
    category: str = ""
    unit: str = "τεμ"
    barcode: str = ""

class ReceiptData(BaseModel):
    device_id: str
    store_name: str = ""
    store_vat: str = ""
    store_address: str = ""
    date: str = ""
    time: str = ""
    receipt_number: str = ""
    total_amount: float = 0.0
    total_vat: float = 0.0
    payment_method: str = ""
    items: List[ProductItem] = []
    source_url: str = ""
    raw_data: Optional[dict] = None

class ManualReceiptInput(BaseModel):
    device_id: str
    store_name: str
    date: str
    total_amount: float
    items: List[ProductItem] = []
    notes: str = ""

class URLImportInput(BaseModel):
    device_id: str
    url: str
    store_hint: str = ""

# ============ HELPER FUNCTIONS ============

def safe_float(value, default=0.0):
    """Safely convert value to float."""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    try:
        cleaned = str(value).replace(',', '.').replace('€', '').replace(' ', '').strip()
        return float(cleaned) if cleaned else default
    except:
        return default

def sanitize_receipt_data(data):
    """Sanitize receipt data for storage."""
    if isinstance(data, dict):
        return {k: sanitize_receipt_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_receipt_data(item) for item in data]
    elif isinstance(data, float):
        if data != data:  # NaN check
            return 0.0
        if data == float('inf') or data == float('-inf'):
            return 0.0
        return data
    return data

STORE_BRANDS = {
    "ab βασιλοπουλος": "AB Βασιλόπουλος",
    "ab vassilopoulos": "AB Βασιλόπουλος",
    "σκλαβενιτης": "Σκλαβενίτης",
    "lidl": "Lidl",
    "μασουτης": "Μασούτης",
    "market in": "Market In",
    "γαλαξιας": "Γαλαξίας",
    "my market": "My Market",
    "bazaar": "Bazaar",
    "metro": "Metro",
    "kritikos": "Κρητικός"
}

def detect_store_brand(store_name: str) -> str:
    """Detect and normalize store brand from name."""
    name_lower = store_name.lower()
    for key, brand in STORE_BRANDS.items():
        if key in name_lower:
            return brand
    return store_name

# ============ ENDPOINTS ============

@router.get("")
async def get_receipts(device_id: str = Query(...), skip: int = 0, limit: int = 50, search: str = ""):
    """Get receipts for a device."""
    query = {"device_id": device_id}
    if search:
        query["$or"] = [
            {"store_name": {"$regex": search, "$options": "i"}},
            {"items.name": {"$regex": search, "$options": "i"}}
        ]
    
    receipts = await db.receipts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.receipts.count_documents({"device_id": device_id})
    
    return {"receipts": receipts, "total": total}

@router.get("/by-store")
async def get_receipts_by_store(
    device_id: str = Query(...),
    store_name: str = Query(...),
    skip: int = 0,
    limit: int = 50
):
    """Get receipts filtered by store."""
    query = {
        "device_id": device_id,
        "store_name": {"$regex": store_name, "$options": "i"}
    }
    
    receipts = await db.receipts.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.receipts.count_documents(query)
    
    return {"receipts": receipts, "total": total}

@router.get("/{receipt_id}")
async def get_receipt(receipt_id: str):
    """Get a specific receipt by ID."""
    receipt = await db.receipts.find_one({"_id": receipt_id})
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return receipt

@router.delete("/{receipt_id}")
async def delete_receipt(receipt_id: str):
    """Delete a receipt."""
    result = await db.receipts.delete_one({"_id": receipt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return {"success": True}

@router.post("/manual")
async def create_manual_receipt(input: ManualReceiptInput):
    """Create a receipt manually."""
    receipt_id = str(uuid.uuid4())
    
    receipt = {
        "_id": receipt_id,
        "device_id": input.device_id,
        "store_name": detect_store_brand(input.store_name),
        "date": input.date,
        "total_amount": input.total_amount,
        "total": input.total_amount,
        "items": [item.dict() for item in input.items],
        "notes": input.notes,
        "source": "manual",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.receipts.insert_one(sanitize_receipt_data(receipt))
    
    return {"success": True, "receipt_id": receipt_id, "receipt": receipt}

@router.delete("/by-store")
async def delete_receipts_by_store(store_name: str = Query(...), device_id: str = Query(...)):
    """Delete all receipts from a specific store."""
    result = await db.receipts.delete_many({
        "device_id": device_id,
        "store_name": {"$regex": store_name, "$options": "i"}
    })
    return {"success": True, "deleted_count": result.deleted_count}
