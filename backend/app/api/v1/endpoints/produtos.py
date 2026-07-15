from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.produtos import (
    SupabaseProductError,
    atualizar_produto_familia,
    criar_categoria_familia,
    listar_categorias_familia,
    listar_produtos_familia,
    reclassificar_produtos_familia,
)
from app.schemas.produtos import (
    CategoriaCreate,
    CategoriaCreateResponse,
    CategoriaResumo,
    ProdutoListaResponse,
    ProdutoUpdate,
    ProdutoUpdateResponse,
    ReclassificacaoResponse,
)

router = APIRouter(tags=["Produtos"])


def _raise_http_error(exc: SupabaseProductError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/produtos", response_model=ProdutoListaResponse)
async def list_products(
    limite: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    busca: str = Query(default="", max_length=100),
    somente_revisar: bool = Query(default=False),
    categoria_id: UUID | None = Query(default=None),
    context: FamilyContext = Depends(get_current_family_context),
) -> ProdutoListaResponse:
    try:
        result = await run_in_threadpool(
            listar_produtos_familia,
            context.access_token,
            limite,
            offset,
            busca,
            somente_revisar,
            str(categoria_id) if categoria_id else None,
        )
    except SupabaseProductError as exc:
        _raise_http_error(exc)

    return ProdutoListaResponse(**result)


@router.patch("/produtos/{produto_id}", response_model=ProdutoUpdateResponse)
async def update_product(
    produto_id: UUID,
    payload: ProdutoUpdate,
    context: FamilyContext = Depends(get_current_family_context),
) -> ProdutoUpdateResponse:
    try:
        result = await run_in_threadpool(
            atualizar_produto_familia,
            str(produto_id),
            payload,
            context.access_token,
        )
    except SupabaseProductError as exc:
        _raise_http_error(exc)

    return ProdutoUpdateResponse(**result)


@router.get("/categorias", response_model=list[CategoriaResumo])
async def list_categories(
    context: FamilyContext = Depends(get_current_family_context),
) -> list[CategoriaResumo]:
    try:
        result = await run_in_threadpool(
            listar_categorias_familia,
            context.access_token,
        )
    except SupabaseProductError as exc:
        _raise_http_error(exc)

    return [CategoriaResumo(**item) for item in result]


@router.post("/categorias", response_model=CategoriaCreateResponse, status_code=201)
async def create_category(
    payload: CategoriaCreate,
    context: FamilyContext = Depends(get_current_family_context),
) -> CategoriaCreateResponse:
    try:
        result = await run_in_threadpool(
            criar_categoria_familia,
            payload.nome,
            context.access_token,
        )
    except SupabaseProductError as exc:
        _raise_http_error(exc)

    return CategoriaCreateResponse(**result)


@router.post("/produtos/reclassificar", response_model=ReclassificacaoResponse)
async def reclassify_products(
    context: FamilyContext = Depends(get_current_family_context),
) -> ReclassificacaoResponse:
    try:
        result = await run_in_threadpool(
            reclassificar_produtos_familia,
            context.access_token,
        )
    except SupabaseProductError as exc:
        _raise_http_error(exc)

    return ReclassificacaoResponse(**result)
