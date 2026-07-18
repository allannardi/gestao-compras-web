from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.cadastros import router as cadastros_router
from app.api.v1.endpoints.compras import router as compras_router
from app.api.v1.endpoints.convites import router as convites_router
from app.api.v1.endpoints.configuracoes import router as configuracoes_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.nfce import router as nfce_router
from app.api.v1.endpoints.produtos import router as produtos_router
from app.core.version import APP_VERSION

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(cadastros_router)
router.include_router(compras_router)
router.include_router(convites_router)
router.include_router(configuracoes_router)
router.include_router(dashboard_router)
router.include_router(nfce_router)
router.include_router(produtos_router)


@router.get("/status", tags=["Sistema"])
def status() -> dict[str, str]:
    return {
        "api": "ready",
        "next_step": "registries-management-validation",
        "version": APP_VERSION,
    }
