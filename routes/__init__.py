"""
Routes package - API endpoints for apodixxi backend.

This module contains all the modular routes that can be gradually
integrated into the main server.py.

Current Status:
- auth.py: Ready for integration
- admin.py: Ready for integration  
- ai.py: Ready for integration
- export.py: Ready for integration
- purchases.py: Ready for integration
- receipts.py: Ready for integration (partial - needs import functions)
- stats.py: Ready for integration
- promotions.py: Ready for integration
- devices.py: Ready for integration

The main server.py still contains:
- Receipt parsing functions (entersoft, impact, mydata XML)
- Admin Dashboard HTML
- Social auth endpoints (Google, Apple, Facebook)
- Store VAT mappings

Future work: Gradually move remaining functionality to modular routes.
"""

# Import all routers for easy access
try:
    from .auth import router as auth_router
    from .admin import router as admin_router
    from .ai import router as ai_router
    from .export import router as export_router
    from .purchases import router as purchases_router
    from .receipts import router as receipts_router
    from .stats import router as stats_router
    from .promotions import router as promotions_router
    from .devices import router as devices_router

    __all__ = [
        "auth_router",
        "admin_router", 
        "ai_router",
        "export_router",
        "purchases_router",
        "receipts_router",
        "stats_router",
        "promotions_router",
        "devices_router"
    ]
except ImportError as e:
    # Graceful degradation if some routes aren't ready
    import logging
    logging.warning(f"Could not import all routes: {e}")
    __all__ = []
