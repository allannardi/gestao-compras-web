from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.configuracoes import (
    SupabaseConfiguracoesError,
    aceitar_convite_familia,
    alterar_papel_membro_familia,
    atualizar_meu_perfil,
    atualizar_nome_familia,
    cancelar_convite_familia,
    criar_convite_familia,
    obter_configuracoes_familia,
    remover_membro_familia,
    selecionar_familia_atual,
)
from app.schemas.configuracoes import (
    AtualizarFamiliaRequest,
    AtualizarPapelRequest,
    AtualizarPerfilRequest,
    ConfiguracoesResponse,
    ConviteCriadoResponse,
    CriarConviteRequest,
    FamiliaSelecionadaResponse,
    MensagemResponse,
)

router = APIRouter(prefix="/configuracoes", tags=["Configurações"])


def _raise_http_error(exc: SupabaseConfiguracoesError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("", response_model=ConfiguracoesResponse)
async def get_settings(
    context: FamilyContext = Depends(get_current_family_context),
) -> ConfiguracoesResponse:
    try:
        result = await run_in_threadpool(
            obter_configuracoes_familia,
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return ConfiguracoesResponse(**result)


@router.patch("/perfil", response_model=MensagemResponse)
async def update_profile(
    payload: AtualizarPerfilRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> MensagemResponse:
    try:
        result = await run_in_threadpool(
            atualizar_meu_perfil,
            payload.nome,
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return MensagemResponse(**result)


@router.patch("/familia", response_model=MensagemResponse)
async def update_family(
    payload: AtualizarFamiliaRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> MensagemResponse:
    try:
        result = await run_in_threadpool(
            atualizar_nome_familia,
            payload.nome,
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return MensagemResponse(**result)


@router.post("/convites", response_model=ConviteCriadoResponse)
async def create_invitation(
    payload: CriarConviteRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> ConviteCriadoResponse:
    try:
        result = await run_in_threadpool(
            criar_convite_familia,
            payload.email,
            payload.papel,
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return ConviteCriadoResponse(**result)


@router.delete("/convites/{convite_id}", response_model=MensagemResponse)
async def cancel_invitation(
    convite_id: UUID,
    context: FamilyContext = Depends(get_current_family_context),
) -> MensagemResponse:
    try:
        result = await run_in_threadpool(
            cancelar_convite_familia,
            str(convite_id),
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return MensagemResponse(**result)


@router.post("/convites/{convite_id}/aceitar", response_model=FamiliaSelecionadaResponse)
async def accept_invitation(
    convite_id: UUID,
    context: FamilyContext = Depends(get_current_family_context),
) -> FamiliaSelecionadaResponse:
    try:
        result = await run_in_threadpool(
            aceitar_convite_familia,
            str(convite_id),
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return FamiliaSelecionadaResponse(**result)


@router.post("/familias/{familia_id}/selecionar", response_model=FamiliaSelecionadaResponse)
async def select_family(
    familia_id: UUID,
    context: FamilyContext = Depends(get_current_family_context),
) -> FamiliaSelecionadaResponse:
    try:
        result = await run_in_threadpool(
            selecionar_familia_atual,
            str(familia_id),
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return FamiliaSelecionadaResponse(**result)


@router.patch("/membros/{usuario_id}", response_model=MensagemResponse)
async def update_member_role(
    usuario_id: UUID,
    payload: AtualizarPapelRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> MensagemResponse:
    try:
        result = await run_in_threadpool(
            alterar_papel_membro_familia,
            str(usuario_id),
            payload.papel,
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return MensagemResponse(**result)


@router.delete("/membros/{usuario_id}", response_model=MensagemResponse)
async def remove_member(
    usuario_id: UUID,
    context: FamilyContext = Depends(get_current_family_context),
) -> MensagemResponse:
    try:
        result = await run_in_threadpool(
            remover_membro_familia,
            str(usuario_id),
            context.access_token,
        )
    except SupabaseConfiguracoesError as exc:
        _raise_http_error(exc)
    return MensagemResponse(**result)
