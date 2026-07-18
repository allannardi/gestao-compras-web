from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from app.core.auth import FamilyContext, get_current_family_context
from app.repositories.exportacoes import (
    SupabaseExportacaoError,
    obter_backup_exportacao_familia,
    obter_resumo_exportacao_familia,
)
from app.schemas.exportacoes import ExportacaoResumoResponse
from app.services.exportacoes import criar_backup_json, criar_excel_exportacao

router = APIRouter(prefix="/exportacoes", tags=["Exportações"])


def _ensure_admin(context: FamilyContext) -> None:
    if context.papel != "administrador":
        raise HTTPException(
            status_code=403,
            detail="Somente administradores podem exportar todos os dados da família.",
        )


def _raise_http_error(exc: SupabaseExportacaoError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/resumo", response_model=ExportacaoResumoResponse)
async def export_summary(
    context: FamilyContext = Depends(get_current_family_context),
) -> ExportacaoResumoResponse:
    _ensure_admin(context)
    try:
        result = await run_in_threadpool(
            obter_resumo_exportacao_familia,
            context.access_token,
        )
    except SupabaseExportacaoError as exc:
        _raise_http_error(exc)
    return ExportacaoResumoResponse(**result)


@router.get("/excel")
async def download_excel(
    context: FamilyContext = Depends(get_current_family_context),
) -> StreamingResponse:
    _ensure_admin(context)
    try:
        payload = await run_in_threadpool(
            obter_backup_exportacao_familia,
            context.access_token,
        )
        content, filename = await run_in_threadpool(
            criar_excel_exportacao,
            payload,
        )
    except SupabaseExportacaoError as exc:
        _raise_http_error(exc)

    return StreamingResponse(
        BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/backup")
async def download_backup(
    context: FamilyContext = Depends(get_current_family_context),
) -> StreamingResponse:
    _ensure_admin(context)
    try:
        payload = await run_in_threadpool(
            obter_backup_exportacao_familia,
            context.access_token,
        )
        content, filename = await run_in_threadpool(
            criar_backup_json,
            payload,
        )
    except SupabaseExportacaoError as exc:
        _raise_http_error(exc)

    return StreamingResponse(
        BytesIO(content),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
