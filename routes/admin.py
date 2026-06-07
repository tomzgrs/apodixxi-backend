"""Admin routes for user and promo code management."""
  from datetime import datetime, timezone, timedelta
  from typing import Optional
  from fastapi import APIRouter, HTTPException, Query, Body
  from pydantic import BaseModel

  from ..config import db, ADMIN_KEY

  router = APIRouter(prefix="/admin", tags=["Admin"])

  # ============ MODELS ============

  class PromoCodeCreate(BaseModel):
      code: str
      days: int
      max_uses: int = 1
      is_active: bool = True

  class GrantPremiumRequest(BaseModel):
      start_date: str
      end_date: str

  # ============ HELPER ============

  def check_admin(admin_key: str):
      if admin_key != ADMIN_KEY:
          raise HTTPException(status_code=403, detail="Invalid admin key")

  # ============ PROMO CODES ============

  @router.post("/promo-codes")
  async def create_promo_code(
      code: str = Body(...),
      days: int = Body(...),
      max_uses: int = Body(1),
      admin_key: str = Query(...)
  ):
      """Create a new promo code."""
      check_admin(admin_key)
      
      existing = await db.promo_codes.find_one({"code": code.upper()})
      if existing:
          raise HTTPException(status_code=400, detail="Promo code already exists")
      
      promo = {
          "code": code.upper(),
          "days": days,
          "max_uses": max_uses,
          "current_uses": 0,
          "is_active": True,
          "created_at": datetime.now(timezone.utc).isoformat()
      }
      
      await db.promo_codes.insert_one(promo)
      return {"success": True, "promo_code": promo}

  @router.get("/promo-codes")
  async def list_promo_codes(admin_key: str = Query(...)):
      """List all promo codes."""
      check_admin(admin_key)
      codes = await db.promo_codes.find().to_list(1000)
      return {"promo_codes": codes}

  @router.delete("/promo-codes/{code}")
  async def delete_promo_code(code: str, admin_key: str = Query(...)):
      """Delete a promo code."""
      check_admin(admin_key)
      result = await db.promo_codes.delete_one({"code": code.upper()})
      if result.deleted_count == 0:
          raise HTTPException(status_code=404, detail="Promo code not found")
      return {"success": True}

  @router.patch("/promo-codes/{code}/toggle")
  async def toggle_promo_code(code: str, is_active: bool = Query(...), admin_key: str = Query(...)):
      """Toggle promo code active status."""
      check_admin(admin_key)
      result = await db.promo_codes.update_one(
          {"code": code.upper()},
          {"$set": {"is_active": is_active}}
      )
      if result.matched_count == 0:
          raise HTTPException(status_code=404, detail="Promo code not found")
      return {"success": True}

  # ============ USER MANAGEMENT ============

  @router.get("/users")
  async def list_users(admin_key: str = Query(...), skip: int = 0, limit: int = 100):
      """List all users with expiring_soon flag."""
      check_admin(admin_key)
      users = await db.users.find({}, {"password_hash": 0}).skip(skip).limit(limit).to_list(limit)
      now = datetime.now(timezone.utc)
      warning_threshold = now + timedelta(days=7)
      for u in users:
          expiry_str = u.get("subscription_expires_at")
          u["expiring_soon"] = False
          u["days_left"] = None
          if expiry_str and u.get("account_type") == "paid":
              try:
                  expiry_dt = datetime.fromisoformat(expiry_str.replace("Z", "+00:00"))
                  if expiry_dt > now:
                      delta = (expiry_dt - now).days
                      u["days_left"] = delta
                      u["expiring_soon"] = expiry_dt <= warning_threshold
              except Exception:
                  pass
      return {"users": users}

  @router.post("/users/{user_id}/grant-premium")
  async def grant_premium(
      user_id: str,
      body: GrantPremiumRequest,
      admin_key: str = Query(...)
  ):
      """Grant premium with explicit start and end dates."""
      check_admin(admin_key)

      user = await db.users.find_one({"_id": user_id})
      if not user:
          raise HTTPException(status_code=404, detail="User not found")

      try:
          start_dt = datetime.fromisoformat(body.start_date.replace("Z", "+00:00"))
          end_dt = datetime.fromisoformat(body.end_date.replace("Z", "+00:00"))
      except ValueError:
          raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601 (YYYY-MM-DD).")

      if end_dt <= start_dt:
          raise HTTPException(status_code=400, detail="end_date must be after start_date")

      await db.users.update_one(
          {"_id": user_id},
          {"$set": {
              "account_type": "paid",
              "premium_start_date": start_dt.isoformat(),
              "subscription_expires_at": end_dt.isoformat(),
          }}
      )

      return {
          "success": True,
          "premium_start_date": start_dt.isoformat(),
          "subscription_expires_at": end_dt.isoformat(),
      }

  @router.post("/users/{user_id}/revoke-premium")
  async def revoke_premium(user_id: str, admin_key: str = Query(...)):
      """Revoke premium and clear all subscription dates."""
      check_admin(admin_key)

      result = await db.users.update_one(
          {"_id": user_id},
          {"$set": {
              "account_type": "free",
              "premium_start_date": None,
              "subscription_expires_at": None,
          }}
      )

      if result.matched_count == 0:
          raise HTTPException(status_code=404, detail="User not found")

      return {"success": True}

  @router.post("/users/{user_id}/upgrade")
  async def upgrade_user(user_id: str, days: int = Body(..., embed=True), admin_key: str = Query(...)):
      """Upgrade user to premium (legacy: adds days from now)."""
      check_admin(admin_key)
      
      user = await db.users.find_one({"_id": user_id})
      if not user:
          raise HTTPException(status_code=404, detail="User not found")
      
      current_expiry = user.get("subscription_expires_at")
      if current_expiry:
          try:
              current_dt = datetime.fromisoformat(current_expiry.replace('Z', '+00:00'))
              if current_dt > datetime.now(timezone.utc):
                  new_expiry = current_dt + timedelta(days=days)
              else:
                  new_expiry = datetime.now(timezone.utc) + timedelta(days=days)
          except:
              new_expiry = datetime.now(timezone.utc) + timedelta(days=days)
      else:
          new_expiry = datetime.now(timezone.utc) + timedelta(days=days)
      
      await db.users.update_one(
          {"_id": user_id},
          {"$set": {
              "account_type": "paid",
              "subscription_expires_at": new_expiry.isoformat()
          }}
      )
      
      return {"success": True, "new_expiry": new_expiry.isoformat()}

  @router.post("/users/{user_id}/downgrade")
  async def downgrade_user(user_id: str, admin_key: str = Query(...)):
      """Downgrade user to free (legacy)."""
      check_admin(admin_key)
      
      result = await db.users.update_one(
          {"_id": user_id},
          {"$set": {
              "account_type": "free",
              "subscription_expires_at": None
          }}
      )
      
      if result.matched_count == 0:
          raise HTTPException(status_code=404, detail="User not found")
      
      return {"success": True}

  # ============ STATS ============

  @router.get("/stats")
  async def get_admin_stats(admin_key: str = Query(...)):
      """Get admin statistics."""
      check_admin(admin_key)
      
      total_users = await db.users.count_documents({})
      paid_users = await db.users.count_documents({"account_type": "paid"})
      total_receipts = await db.receipts.count_documents({})
      total_promo_codes = await db.promo_codes.count_documents({})
      active_promo_codes = await db.promo_codes.count_documents({"is_active": True})
      
      return {
          "total_users": total_users,
          "paid_users": paid_users,
          "free_users": total_users - paid_users,
          "total_receipts": total_receipts,
          "total_promo_codes": total_promo_codes,
          "active_promo_codes": active_promo_codes
      }
  