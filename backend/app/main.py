from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.observability import observability_middleware
from app.core.version import APP_VERSION

app = FastAPI(
    title=settings.app_name,
    version=APP_VERSION,
)

app.middleware("http")(observability_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Request-ID", "X-Response-Time-Ms"],
)

app.include_router(api_router)


@app.get("/", tags=["Sistema"])
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": APP_VERSION,
        "status": "online",
        "environment": settings.app_env,
    }


@app.get("/health", tags=["Sistema"])
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "gestao-compras-api",
        "version": APP_VERSION,
        "environment": settings.app_env,
    }


@app.get("/ready", tags=["Sistema"])
def ready() -> dict[str, str | bool]:
    configured = settings.supabase_configured
    admin_configured = settings.supabase_admin_configured
    return {
        "status": "ready" if configured and admin_configured else "configuration_required",
        "service": "gestao-compras-api",
        "version": APP_VERSION,
        "supabase_configured": configured,
        "admin_actions_configured": admin_configured,
    }
