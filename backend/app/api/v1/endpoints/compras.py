from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.compras import SupabasePurchaseError, registrar_compra_nfce
from app.schemas.compras import CompraCreateResponse, CompraNfceCreate

router = APIRouter(prefix="/compras", tags=["Compras"])


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
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return CompraCreateResponse(**result)
