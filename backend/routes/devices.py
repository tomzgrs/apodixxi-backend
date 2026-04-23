"""Device routes for device registration."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

from ..config import db

router = APIRouter(prefix="/devices", tags=["Devices"])

# ============ MODELS ============

class DeviceRegister(BaseModel):
    device_id: str = ""
    platform: str = "unknown"
    app_version: str = ""

# ============ ENDPOINTS ============

@router.post("/register")
async def register_device(input: DeviceRegister):
    """Register or update a device."""
    device_id = input.device_id or f"dev_{uuid.uuid4().hex[:20]}"
    
    existing = await db.devices.find_one({"_id": device_id})
    
    if existing:
        await db.devices.update_one(
            {"_id": device_id},
            {"$set": {
                "last_seen": datetime.now(timezone.utc).isoformat(),
                "platform": input.platform,
                "app_version": input.app_version
            }}
        )
    else:
        await db.devices.insert_one({
            "_id": device_id,
            "platform": input.platform,
            "app_version": input.app_version,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_seen": datetime.now(timezone.utc).isoformat()
        })
    
    return {"device_id": device_id, "registered": True}
