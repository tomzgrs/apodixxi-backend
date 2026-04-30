"""In-App Purchase routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..config import db, logger

router = APIRouter(prefix="/purchases", tags=["Purchases"])

# ============ MODELS ============

class PurchaseVerifyRequest(BaseModel):
    purchase_token: str
    product_id: str
    platform: str = "android"  # android or ios
    user_email: str = ""

# ============ ENDPOINTS ============

@router.post("/verify")
async def verify_purchase(request: PurchaseVerifyRequest):
    """Verify and process an in-app purchase."""
    logger.info(f"Verifying purchase: {request.product_id} for {request.user_email}")
    
    # Check if this purchase was already processed
    existing = await db.purchases.find_one({"purchase_token": request.purchase_token})
    if existing:
        return {
            "success": True,
            "already_processed": True,
            "message": "Purchase already verified"
        }
    
    # Determine subscription duration based on product
    days_to_add = 30  # default monthly
    if "yearly" in request.product_id.lower() or "annual" in request.product_id.lower():
        days_to_add = 365
    elif "monthly" in request.product_id.lower():
        days_to_add = 30
    
    # Store purchase record
    purchase_record = {
        "purchase_token": request.purchase_token,
        "product_id": request.product_id,
        "platform": request.platform,
        "user_email": request.user_email.lower() if request.user_email else "",
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "days_granted": days_to_add
    }
    await db.purchases.insert_one(purchase_record)
    
    # Update user subscription if email provided
    if request.user_email:
        user = await db.users.find_one({"email": request.user_email.lower()})
        if user:
            current_expiry = user.get("subscription_expires_at")
            if current_expiry:
                try:
                    current_dt = datetime.fromisoformat(current_expiry.replace('Z', '+00:00'))
                    if current_dt > datetime.now(timezone.utc):
                        new_expiry = current_dt + timedelta(days=days_to_add)
                    else:
                        new_expiry = datetime.now(timezone.utc) + timedelta(days=days_to_add)
                except:
                    new_expiry = datetime.now(timezone.utc) + timedelta(days=days_to_add)
            else:
                new_expiry = datetime.now(timezone.utc) + timedelta(days=days_to_add)
            
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "account_type": "paid",
                    "subscription_expires_at": new_expiry.isoformat()
                }}
            )
            
            logger.info(f"Updated subscription for {request.user_email} until {new_expiry}")
    
    return {
        "success": True,
        "already_processed": False,
        "days_granted": days_to_add,
        "message": f"Subscription activated for {days_to_add} days"
    }

@router.get("/status")
async def get_purchase_status(user_email: str = Query(...)):
    """Check if user has active premium subscription."""
    user = await db.users.find_one({"email": user_email.lower()})
    
    if not user:
        return {"is_premium": False, "expires_at": None}
    
    if user.get("account_type") != "paid":
        return {"is_premium": False, "expires_at": None}
    
    expires_at = user.get("subscription_expires_at")
    if expires_at:
        try:
            expiry_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expiry_dt < datetime.now(timezone.utc):
                return {"is_premium": False, "expires_at": expires_at, "expired": True}
        except:
            pass
    
    return {
        "is_premium": True,
        "expires_at": expires_at
    }

@router.post("/restore")
async def restore_purchases(user_email: str):
    """Restore purchases for a user."""
    # Find all purchases for this email
    purchases = await db.purchases.find({"user_email": user_email.lower()}).to_list(100)
    
    if not purchases:
        return {"success": False, "message": "No purchases found"}
    
    return {
        "success": True,
        "purchases_count": len(purchases),
        "message": f"Found {len(purchases)} purchase(s)"
    }
