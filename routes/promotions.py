"""Promotions and recommendations routes."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from ..config import db, ADMIN_KEY

router = APIRouter(prefix="/promotions", tags=["Promotions"])

# ============ MODELS ============

class PromotionCreate(BaseModel):
    title: str
    description: str = ""
    original_price: float
    promo_price: float
    store: str
    category: str = ""
    image_url: str = ""
    valid_until: str = ""
    priority: int = 0

class PromotionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    original_price: Optional[float] = None
    promo_price: Optional[float] = None
    store: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    valid_until: Optional[str] = None
    active: Optional[bool] = None
    priority: Optional[int] = None

# ============ HELPER ============

def check_admin(admin_key: str):
    if admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")

# ============ PUBLIC ENDPOINTS ============

@router.get("/recommendations")
async def get_recommendations(
    device_id: str = Query(...),
    category: str = Query(""),
    store: str = Query(""),
    limit: int = Query(10, ge=1, le=50)
):
    """Get personalized product recommendations."""
    # Get active promotions
    query = {"active": True}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if store:
        query["store"] = {"$regex": store, "$options": "i"}
    
    promotions = await db.promotions.find(query).sort("priority", -1).limit(limit).to_list(limit)
    
    # Get user's purchase history for personalization
    receipts = await db.receipts.find({"device_id": device_id}).limit(50).to_list(50)
    
    # Extract frequently bought products
    product_counts = {}
    store_counts = {}
    for receipt in receipts:
        store_name = receipt.get("store_name", "")
        store_counts[store_name] = store_counts.get(store_name, 0) + 1
        
        for item in receipt.get("items", []):
            name = item.get("name", item.get("description", ""))
            if name:
                product_counts[name] = product_counts.get(name, 0) + 1
    
    # Sort promotions by relevance
    def score_promotion(promo):
        score = promo.get("priority", 0)
        # Boost if from frequent store
        if promo.get("store") in store_counts:
            score += store_counts[promo.get("store")] * 2
        # Boost by discount percentage
        orig = promo.get("original_price", 1)
        promo_price = promo.get("promo_price", orig)
        if orig > 0:
            discount = (orig - promo_price) / orig * 100
            score += discount / 10
        return score
    
    sorted_promos = sorted(promotions, key=score_promotion, reverse=True)
    
    return {
        "recommendations": sorted_promos,
        "personalized": len(receipts) > 0,
        "based_on_stores": list(store_counts.keys())[:5]
    }

@router.get("/after-save")
async def get_after_save_recommendations(
    device_id: str = Query(...),
    store_name: str = Query(...),
    limit: int = Query(5)
):
    """Get recommendations after saving a receipt."""
    # Get promotions from the same store
    query = {
        "active": True,
        "store": {"$regex": store_name, "$options": "i"}
    }
    
    promotions = await db.promotions.find(query).sort("priority", -1).limit(limit).to_list(limit)
    
    if len(promotions) < limit:
        # Add general promotions
        other_promos = await db.promotions.find({
            "active": True,
            "store": {"$not": {"$regex": store_name, "$options": "i"}}
        }).sort("priority", -1).limit(limit - len(promotions)).to_list(limit - len(promotions))
        promotions.extend(other_promos)
    
    return {"recommendations": promotions}

@router.post("/track/click/{promo_id}")
async def track_recommendation_click(promo_id: str):
    """Track when a user clicks on a recommendation."""
    await db.promotions.update_one({"_id": promo_id}, {"$inc": {"clicks": 1}})
    return {"success": True}

@router.post("/track/view/{promo_id}")
async def track_recommendation_view(promo_id: str):
    """Track when a user views a recommendation."""
    await db.promotions.update_one({"_id": promo_id}, {"$inc": {"views": 1}})
    return {"success": True}

# ============ ADMIN ENDPOINTS ============

@router.post("")
async def create_promotion(
    promo: PromotionCreate,
    admin_key: str = Query(...)
):
    """Create a new promotion (admin only)."""
    check_admin(admin_key)
    
    promo_id = str(uuid.uuid4())
    promotion = {
        "_id": promo_id,
        "title": promo.title,
        "description": promo.description,
        "original_price": promo.original_price,
        "promo_price": promo.promo_price,
        "store": promo.store,
        "category": promo.category,
        "image_url": promo.image_url,
        "valid_until": promo.valid_until,
        "priority": promo.priority,
        "active": True,
        "views": 0,
        "clicks": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.promotions.insert_one(promotion)
    return {"success": True, "promotion": promotion}

@router.get("")
async def list_promotions(
    admin_key: str = Query(...),
    active_only: bool = Query(False),
    skip: int = 0,
    limit: int = 50
):
    """List all promotions (admin only)."""
    check_admin(admin_key)
    
    query = {"active": True} if active_only else {}
    promotions = await db.promotions.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.promotions.count_documents(query)
    
    return {"promotions": promotions, "total": total}

@router.patch("/{promo_id}")
async def update_promotion(
    promo_id: str,
    updates: PromotionUpdate,
    admin_key: str = Query(...)
):
    """Update a promotion (admin only)."""
    check_admin(admin_key)
    
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.promotions.update_one({"_id": promo_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return {"success": True}

@router.delete("/{promo_id}")
async def delete_promotion(promo_id: str, admin_key: str = Query(...)):
    """Delete a promotion (admin only)."""
    check_admin(admin_key)
    
    result = await db.promotions.delete_one({"_id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return {"success": True}
