from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.convites import (
    SupabaseConvitesError,
    aceitar_convite_por_token,
    consultar_convite_publico,
)
from app.schemas.convites import (
    AceitarConviteTokenRequest,
    ConviteAceitoResponse,
    ConvitePublicoResponse,
)

router = APIRouter(prefix="/convites", tags=["Convites"])


def _raise_http_error(exc: SupabaseConvitesError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/publico/{token}", response_model=ConvitePublicoResponse)
async def get_public_invitation(token: str) -> ConvitePublicoResponse:
    try:
        result = await run_in_threadpool(consultar_convite_publico, token)
    except SupabaseConvitesError as exc:
        _raise_http_error(exc)
    return ConvitePublicoResponse(**result)


@router.post("/aceitar", response_model=ConviteAceitoResponse)
async def accept_invitation_by_token(
    payload: AceitarConviteTokenRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> ConviteAceitoResponse:
    try:
        result = await run_in_threadpool(
            aceitar_convite_por_token,
            payload.token,
            context.access_token,
        )
    except SupabaseConvitesError as exc:
        _raise_http_error(exc)
    return ConviteAceitoResponse(**result)
