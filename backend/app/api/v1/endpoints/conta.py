from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.auth import (
    AuthenticatedUser,
    FamilyContext,
    get_current_family_context,
    get_current_user,
)
from app.repositories.conta import (
    SupabaseContaError,
    excluir_familia_atual,
    excluir_minha_conta,
)
from app.schemas.conta import (
    ExcluirContaRequest,
    ExcluirContaResponse,
    ExcluirFamiliaRequest,
    ExcluirFamiliaResponse,
)

router = APIRouter(prefix="/conta", tags=["Conta e privacidade"])


def _raise_http_error(exc: SupabaseContaError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/excluir", response_model=ExcluirContaResponse)
async def delete_own_account(
    payload: ExcluirContaRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ExcluirContaResponse:
    try:
        result = await run_in_threadpool(
            excluir_minha_conta,
            user.id,
            payload.email_confirmacao,
            user.access_token,
        )
    except SupabaseContaError as exc:
        _raise_http_error(exc)
    return ExcluirContaResponse(**result)


@router.post("/familia/excluir", response_model=ExcluirFamiliaResponse)
async def delete_current_family(
    payload: ExcluirFamiliaRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> ExcluirFamiliaResponse:
    try:
        result = await run_in_threadpool(
            excluir_familia_atual,
            payload.nome_confirmacao,
            context.access_token,
        )
    except SupabaseContaError as exc:
        _raise_http_error(exc)
    return ExcluirFamiliaResponse(**result)
