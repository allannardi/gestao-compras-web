from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.core.auth import (
    AuthenticatedUser,
    FamilyContext,
    get_current_family_context,
    get_current_user,
)
from app.core.observability import log_technical_event, request_id_from_request
from app.repositories.beta import (
    SupabaseBetaError,
    concluir_onboarding_beta,
    obter_onboarding_beta,
    obter_status_aceite_legal,
    registrar_aceite_legal,
    registrar_visualizacao_privacidade,
)
from app.schemas.beta import (
    AceiteLegalRegistradoResponse,
    AceiteLegalStatusResponse,
    OnboardingBetaResponse,
    OnboardingConcluidoResponse,
    PrivacidadeRegistradaResponse,
    RegistrarAceiteLegalRequest,
    TelemetriaTecnicaRequest,
    TelemetriaTecnicaResponse,
)

router = APIRouter(prefix="/beta", tags=["Beta controlado"])


def _raise_http_error(exc: SupabaseBetaError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/aceite-legal", response_model=AceiteLegalStatusResponse)
async def get_legal_acceptance(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AceiteLegalStatusResponse:
    try:
        result = await run_in_threadpool(
            obter_status_aceite_legal,
            user.access_token,
        )
    except SupabaseBetaError as exc:
        _raise_http_error(exc)
    return AceiteLegalStatusResponse(**result)


@router.post("/aceite-legal", response_model=AceiteLegalRegistradoResponse)
async def accept_legal_documents(
    payload: RegistrarAceiteLegalRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> AceiteLegalRegistradoResponse:
    try:
        result = await run_in_threadpool(
            registrar_aceite_legal,
            user.access_token,
            payload.termos_versao,
            payload.privacidade_versao,
        )
    except SupabaseBetaError as exc:
        _raise_http_error(exc)
    return AceiteLegalRegistradoResponse(**result)


@router.post("/telemetria", response_model=TelemetriaTecnicaResponse)
async def receive_technical_telemetry(
    payload: TelemetriaTecnicaRequest,
    request: Request,
    _: AuthenticatedUser = Depends(get_current_user),
) -> TelemetriaTecnicaResponse:
    request_id = payload.request_id or request_id_from_request(request)
    log_technical_event(
        event=payload.evento,
        page=payload.pagina,
        app_version=payload.app_version,
        code=payload.codigo,
        request_id=request_id,
    )
    return TelemetriaTecnicaResponse(recebido=True)


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
