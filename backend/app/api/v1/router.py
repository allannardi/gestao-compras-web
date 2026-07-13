from fastapi import APIRouter

from app.api.v1.endpoints.nfce import router as nfce_router
from app.core.version import APP_VERSION

router = APIRouter(prefix="/api/v1")
router.include_router(nfce_router)


@router.get("/status", tags=["Sistema"])
def status() -> dict[str, str]:
    return {
        "api": "ready",
        "next_step": "online-iphone-validation",
        "version": APP_VERSION,
    }
