from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.dashboard import (
    SupabaseDashboardError,
    buscar_produtos_historico_familia,
    listar_supermercados_familia,
    obter_dashboard_familia,
    obter_historico_produto_familia,
)
from app.schemas.dashboard import (
    DashboardResponse,
    HistoricoProdutoOpcao,
    HistoricoProdutoResponse,
    SupermercadoResumo,
)

router = APIRouter(tags=["Dashboard"])


def _raise_http_error(exc: SupabaseDashboardError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/supermercados", response_model=list[SupermercadoResumo])
async def list_supermarkets(
    context: FamilyContext = Depends(get_current_family_context),
) -> list[SupermercadoResumo]:
    try:
        result = await run_in_threadpool(
            listar_supermercados_familia,
            context.access_token,
        )
    except SupabaseDashboardError as exc:
        _raise_http_error(exc)

    return [SupermercadoResumo(**item) for item in result]


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    mes: date | None = Query(default=None),
    context: FamilyContext = Depends(get_current_family_context),
) -> DashboardResponse:
    try:
        result = await run_in_threadpool(
            obter_dashboard_familia,
            context.access_token,
            mes,
        )
    except SupabaseDashboardError as exc:
        _raise_http_error(exc)

    return DashboardResponse(**result)


@router.get(
    "/historico-precos/produtos",
    response_model=list[HistoricoProdutoOpcao],
)
async def search_price_history_products(
    busca: str = Query(default="", max_length=100),
    limite: int = Query(default=200, ge=1, le=200),
    context: FamilyContext = Depends(get_current_family_context),
) -> list[HistoricoProdutoOpcao]:
    try:
        result = await run_in_threadpool(
            buscar_produtos_historico_familia,
            context.access_token,
            busca,
            limite,
        )
    except SupabaseDashboardError as exc:
        _raise_http_error(exc)

    return [HistoricoProdutoOpcao(**item) for item in result]


@router.get(
    "/historico-precos/produtos/{produto_id}",
    response_model=HistoricoProdutoResponse,
)
async def get_product_price_history(
    produto_id: UUID,
    limite: int = Query(default=30, ge=2, le=100),
    context: FamilyContext = Depends(get_current_family_context),
) -> HistoricoProdutoResponse:
    try:
        result = await run_in_threadpool(
            obter_historico_produto_familia,
            str(produto_id),
            context.access_token,
            limite,
        )
    except SupabaseDashboardError as exc:
        _raise_http_error(exc)

    return HistoricoProdutoResponse(**result)
