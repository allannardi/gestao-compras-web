from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.compras import (
    SupabasePurchaseError,
    detalhar_compra_familia,
    excluir_compra_teste,
    listar_compras_familia,
    registrar_compra_nfce,
)
from app.schemas.compras import (
    CompraCreateResponse,
    CompraDeleteRequest,
    CompraDeleteResponse,
    CompraDetalheResponse,
    CompraListaResponse,
    CompraNfceCreate,
)

router = APIRouter(prefix="/compras", tags=["Compras"])


def _raise_http_error(exc: SupabasePurchaseError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("", response_model=CompraListaResponse)
async def list_purchases(
    limite: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    supermercado_id: UUID | None = Query(default=None),
    mes: date | None = Query(default=None),
    context: FamilyContext = Depends(get_current_family_context),
) -> CompraListaResponse:
    try:
        result = await run_in_threadpool(
            listar_compras_familia,
            context.access_token,
            limite,
            offset,
            str(supermercado_id) if supermercado_id else None,
            mes,
        )
    except SupabasePurchaseError as exc:
        _raise_http_error(exc)

    return CompraListaResponse(**result)


@router.get("/{compra_id}", response_model=CompraDetalheResponse)
async def get_purchase_detail(
    compra_id: UUID,
    context: FamilyContext = Depends(get_current_family_context),
) -> CompraDetalheResponse:
    try:
        result = await run_in_threadpool(
            detalhar_compra_familia,
            str(compra_id),
            context.access_token,
        )
    except SupabasePurchaseError as exc:
        _raise_http_error(exc)

    return CompraDetalheResponse(**result)


@router.delete("/{compra_id}", response_model=CompraDeleteResponse)
async def delete_test_purchase(
    compra_id: UUID,
    payload: CompraDeleteRequest,
    context: FamilyContext = Depends(get_current_family_context),
) -> CompraDeleteResponse:
    if context.papel != "administrador":
        raise HTTPException(
            status_code=403,
            detail="Somente administradores podem excluir compras de teste.",
        )

    try:
        result = await run_in_threadpool(
            excluir_compra_teste,
            str(compra_id),
            payload.confirmacao,
            context.access_token,
        )
    except SupabasePurchaseError as exc:
        _raise_http_error(exc)

    return CompraDeleteResponse(**result)


@router.post("", response_model=CompraCreateResponse, status_code=201)
async def create_purchase(
    purchase: CompraNfceCreate,
    context: FamilyContext = Depends(get_current_family_context),
) -> CompraCreateResponse:
    try:
        result = await run_in_threadpool(
            registrar_compra_nfce,
            purchase,
            context.access_token,
        )
    except SupabasePurchaseError as exc:
        _raise_http_error(exc)

    return CompraCreateResponse(**result)
