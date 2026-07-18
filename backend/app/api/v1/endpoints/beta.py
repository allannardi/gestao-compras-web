from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.beta import (
    SupabaseBetaError,
    concluir_onboarding_beta,
    obter_onboarding_beta,
    registrar_visualizacao_privacidade,
)
from app.schemas.beta import (
    OnboardingBetaResponse,
    OnboardingConcluidoResponse,
    PrivacidadeRegistradaResponse,
)

router = APIRouter(prefix="/beta", tags=["Preparação para beta"])


def _raise_http_error(exc: SupabaseBetaError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/onboarding", response_model=OnboardingBetaResponse)
async def get_onboarding(
    context: FamilyContext = Depends(get_current_family_context),
) -> OnboardingBetaResponse:
    try:
        result = await run_in_threadpool(
            obter_onboarding_beta,
            context.access_token,
        )
    except SupabaseBetaError as exc:
        _raise_http_error(exc)
    return OnboardingBetaResponse(**result)


@router.post("/onboarding/concluir", response_model=OnboardingConcluidoResponse)
async def complete_onboarding(
    context: FamilyContext = Depends(get_current_family_context),
) -> OnboardingConcluidoResponse:
    try:
        result = await run_in_threadpool(
            concluir_onboarding_beta,
            context.access_token,
        )
    except SupabaseBetaError as exc:
        _raise_http_error(exc)
    return OnboardingConcluidoResponse(**result)


@router.post("/privacidade/visualizacao", response_model=PrivacidadeRegistradaResponse)
async def register_privacy_view(
    context: FamilyContext = Depends(get_current_family_context),
) -> PrivacidadeRegistradaResponse:
    try:
        result = await run_in_threadpool(
            registrar_visualizacao_privacidade,
            context.access_token,
        )
    except SupabaseBetaError as exc:
        _raise_http_error(exc)
    return PrivacidadeRegistradaResponse(**result)
