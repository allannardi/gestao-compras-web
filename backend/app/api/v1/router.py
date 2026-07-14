from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.compras import router as compras_router
from app.api.v1.endpoints.nfce import router as nfce_router
from app.core.version import APP_VERSION

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(compras_router)
router.include_router(nfce_router)


@router.get("/status", tags=["Sistema"])
def status() -> dict[str, str]:
    return {
        "api": "ready",
        "next_step": "purchase-persistence-validation",
        "version": APP_VERSION,
    }
