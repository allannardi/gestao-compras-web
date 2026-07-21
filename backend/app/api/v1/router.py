from fastapi import APIRouter

from app.api.v1.endpoints.admin_geral import router as admin_geral_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.beta import router as beta_router
from app.api.v1.endpoints.cadastros import router as cadastros_router
from app.api.v1.endpoints.compras import router as compras_router
from app.api.v1.endpoints.conta import router as conta_router
from app.api.v1.endpoints.convites import router as convites_router
from app.api.v1.endpoints.configuracoes import router as configuracoes_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.exportacoes import router as exportacoes_router
from app.api.v1.endpoints.nfce import router as nfce_router
from app.api.v1.endpoints.produtos import router as produtos_router
from app.core.legal import PRIVACY_VERSION, TERMS_VERSION
from app.core.version import APP_VERSION

router = APIRouter(prefix="/api/v1")
router.include_router(auth_router)
router.include_router(admin_geral_router)
router.include_router(beta_router)
router.include_router(cadastros_router)
router.include_router(compras_router)
router.include_router(conta_router)
router.include_router(convites_router)
router.include_router(configuracoes_router)
router.include_router(dashboard_router)
router.include_router(exportacoes_router)
router.include_router(nfce_router)
router.include_router(produtos_router)


@router.get("/status", tags=["Sistema"])
def status() -> dict[str, str]:
    return {
        "api": "ready",
        "next_step": "admin-general-foundation",
        "version": APP_VERSION,
        "terms_version": TERMS_VERSION,
        "privacy_version": PRIVACY_VERSION,
    }
