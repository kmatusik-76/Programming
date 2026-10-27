"""
Pakiet routerów FastAPI.
"""
from app.routers.auth import router as auth_router
from app.routers.links import router as links_router

__all__ = ["auth_router", "links_router"]
