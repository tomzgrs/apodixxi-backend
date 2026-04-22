"""Authentication routes."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext

from ..config import db, JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# ============ MODELS ============

class UserSignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""

class UserLoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    google_id: Optional[str] = None
    id_token: Optional[str] = None
    email: str
    name: str = ""
    picture: Optional[str] = None

class AppleAuthRequest(BaseModel):
    apple_id: Optional[str] = None
    identity_token: Optional[str] = None
    email: str
    name: str = ""

class FacebookAuthRequest(BaseModel):
    facebook_id: Optional[str] = None
    access_token: Optional[str] = None
    email: str
    name: str = ""
    picture: Optional[str] = None
    post_to_wall: bool = False

class PhoneOTPRequest(BaseModel):
    phone_number: str

class PhoneOTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str

class PhoneCompleteRequest(BaseModel):
    phone_number: str
    email: str

class UpdatePhoneRequest(BaseModel):
    phone_number: str

class PromoCodeRequest(BaseModel):
    code: str

# ============ HELPER FUNCTIONS ============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh"
    }
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id:
            return await db.users.find_one({"_id": user_id})
    except:
        pass
    return None

# ============ ENDPOINTS ============

@router.post("/signup")
async def signup(request: UserSignupRequest):
    """Register a new user with email and password."""
    existing = await db.users.find_one({"email": request.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    user_id = str(uuid.uuid4())
    user = {
        "_id": user_id,
        "email": request.email.lower(),
        "name": request.name,
        "password_hash": hash_password(request.password),
        "phone": None,
        "auth_provider": "email",
        "account_type": "free",
        "subscription_expires_at": None,
        "is_email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    access_token = create_access_token(user_id, user["email"])
    refresh_token = create_refresh_token(user_id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user["name"],
            "phone": user["phone"],
            "auth_provider": user["auth_provider"],
            "account_type": user["account_type"],
            "is_email_verified": user["is_email_verified"]
        }
    }

@router.post("/login")
async def login(request: UserLoginRequest):
    """Login with email and password."""
    user = await db.users.find_one({"email": request.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use your social login method")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_device_id = user.get("device_id")
    if not user_device_id:
        user_device_id = f"dev_{uuid.uuid4().hex[:20]}"
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "device_id": user_device_id
        }}
    )
    
    access_token = create_access_token(user["_id"], user["email"])
    refresh_token = create_refresh_token(user["_id"])
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "device_id": user_device_id,
        "user": {
            "id": user["_id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "phone": user.get("phone"),
            "auth_provider": user.get("auth_provider", "email"),
            "account_type": user.get("account_type", "free"),
            "is_email_verified": user.get("is_email_verified", False),
            "device_id": user_device_id
        }
    }

@router.post("/refresh")
async def refresh_token(refresh_token: str = Body(..., embed=True)):
    """Refresh access token using refresh token."""
    payload = verify_token(refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    user_id = payload.get("sub")
    user = await db.users.find_one({"_id": user_id})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    new_access_token = create_access_token(user["_id"], user["email"])
    new_refresh_token = create_refresh_token(user["_id"])
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": user["_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "phone": user.get("phone"),
        "auth_provider": user.get("auth_provider", "email"),
        "account_type": user.get("account_type", "free"),
        "subscription_expires_at": user.get("subscription_expires_at"),
        "is_email_verified": user.get("is_email_verified", False),
        "device_id": user.get("device_id")
    }

@router.post("/update-phone")
async def update_phone(request: UpdatePhoneRequest, user: dict = Depends(get_current_user)):
    """Update user phone number."""
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"phone": request.phone_number}})
    return {"success": True, "message": "Phone number updated"}

@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Logout (client should discard tokens)."""
    return {"success": True, "message": "Logged out successfully"}
