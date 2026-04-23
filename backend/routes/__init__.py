"""Routes package - API endpoints for apodixxi backend."""

from .auth import router as auth_router
from .admin import router as admin_router
from .ai import router as ai_router
from .export import router as export_router
from .purchases import router as purchases_router
from .receipts import router as receipts_router
from .stats import router as stats_router
from .promotions import router as promotions_router

__all__ = [
    "auth_router",
    "admin_router", 
    "ai_router",
    "export_router",
    "purchases_router",
    "receipts_router",
    "stats_router",
    "promotions_router"
]
