from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.cadastros import (
    SupabaseCadastrosError,
    atualizar_categoria_cadastro,
    atualizar_supermercado_cadastro,
    desativar_categoria_cadastro,
    mesclar_supermercados_cadastro,
    obter_cadastros_familia,
    reativar_categoria_cadastro,
)
from app.schemas.cadastros import (
    AtualizarCategoriaRequest,
    AtualizarSupermercadoRequest,
    CadastrosResponse,
    CategoriaAtualizadaResponse,
    DesativarCategoriaRequest,
    MesclarSupermercadoRequest,
    SupermercadoAtualizadoResponse,
)

router = APIRouter(prefix="/cadastros", tags=["Cadastros"])


def _raise_http_error(exc: SupabaseCadastrosError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("", response_model=CadastrosResponse)
async def get_registries(
    context: FamilyContext = Depends(get_current_family_context),
) -> CadastrosResponse:
    try:
        result = await run_in_threadpool(
            obter_cadastros_familia,
            context.access_token,
        )
    except SupabaseCadastrosError as exc:
        _raise_http_error(exc)
    return CadastrosResponse(**result)


@router.patch(
    "/categorias/{categoria_id}",
    response_model=CategoriaAtualizadaResponse,
)
async def update_category(
    categoria_id: UUID,
    payload: AtualizarCategoriaRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> CategoriaAtualizadaResponse:
    try:
        result = await run_in_threadpool(
            atualizar_categoria_cadastro,
            str(categoria_id),
            payload.nome,
            context.access_token,
        )
    except SupabaseCadastrosError as exc:
        _raise_http_error(exc)
    return CategoriaAtualizadaResponse(**result)


@router.post(
    "/categorias/{categoria_id}/desativar",
    response_model=CategoriaAtualizadaResponse,
)
async def deactivate_category(
    categoria_id: UUID,
    payload: DesativarCategoriaRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> CategoriaAtualizadaResponse:
    try:
        result = await run_in_threadpool(
            desativar_categoria_cadastro,
            str(categoria_id),
            str(payload.categoria_destino_id),
            context.access_token,
        )
    except SupabaseCadastrosError as exc:
        _raise_http_error(exc)
    return CategoriaAtualizadaResponse(**result)


@router.post(
    "/categorias/{categoria_id}/reativar",
    response_model=CategoriaAtualizadaResponse,
)
async def reactivate_category(
    categoria_id: UUID,
    context: FamilyContext = Depends(get_current_family_context),
) -> CategoriaAtualizadaResponse:
    try:
        result = await run_in_threadpool(
            reativar_categoria_cadastro,
            str(categoria_id),
            context.access_token,
        )
    except SupabaseCadastrosError as exc:
        _raise_http_error(exc)
    return CategoriaAtualizadaResponse(**result)


@router.patch(
    "/supermercados/{supermercado_id}",
    response_model=SupermercadoAtualizadoResponse,
)
async def update_supermarket(
    supermercado_id: UUID,
    payload: AtualizarSupermercadoRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> SupermercadoAtualizadoResponse:
    try:
        result = await run_in_threadpool(
            atualizar_supermercado_cadastro,
            str(supermercado_id),
            payload.nome,
            context.access_token,
        )
    except SupabaseCadastrosError as exc:
        _raise_http_error(exc)
    return SupermercadoAtualizadoResponse(**result)


@router.post(
    "/supermercados/{supermercado_id}/mesclar",
    response_model=SupermercadoAtualizadoResponse,
)
async def merge_supermarkets(
    supermercado_id: UUID,
    payload: MesclarSupermercadoRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> SupermercadoAtualizadoResponse:
    try:
        result = await run_in_threadpool(
            mesclar_supermercados_cadastro,
            str(supermercado_id),
            str(payload.supermercado_destino_id),
            context.access_token,
        )
    except SupabaseCadastrosError as exc:
        _raise_http_error(exc)
    return SupermercadoAtualizadoResponse(**result)
