"""Pydantic models for the application."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field

# ============ AUTH MODELS ============

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

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class PromoCodeRequest(BaseModel):
    code: str


# ============ RECEIPT MODELS ============

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
    force_import: bool = False

class DeviceRegister(BaseModel):
    device_id: str
    language: str = "el"

class WebViewExtractedData(BaseModel):
    device_id: str
    url: str = ""
    raw_text: str = ""
    items: List[dict] = []
    store_name: str = ""
    found_final_total: float = 0.0


# ============ RECOMMENDATION MODELS ============

class PromotionCreate(BaseModel):
    title: str
    description: str
    image_url: str = ""
    action_url: str = ""
    target_stores: List[str] = []
    target_categories: List[str] = []
    target_min_spend: float = 0
    target_max_spend: float = 999999
    priority: int = 0
    is_active: bool = True
    valid_from: str = ""
    valid_until: str = ""
    location: str = "dashboard"


# ============ AI MODELS ============

class AIInsightRequest(BaseModel):
    device_id: str
    insight_type: str = "general"  # general, savings, trends

class AIChatRequest(BaseModel):
    device_id: str
    message: str
    conversation_history: List[dict] = []

class AIRecommendationRequest(BaseModel):
    device_id: str
    context: str = "shopping"  # shopping, budget, savings


# ============ PURCHASE MODELS ============

class PurchaseVerifyRequest(BaseModel):
    purchase_token: str
    product_id: str
    platform: str = "android"  # android or ios
    user_email: str = ""

class PurchaseHistoryItem(BaseModel):
    purchase_token: str
    product_id: str
    purchase_date: str
    platform: str
