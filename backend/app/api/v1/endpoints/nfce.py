from fastapi import APIRouter, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.schemas.nfce import NfcePreviewResponse
from app.services.nfce_parser import consultar_nfce_por_qrcode
from app.services.qr_decoder import InvalidImageError, decode_qr_from_bytes, extrair_chave_nfce

router = APIRouter(prefix="/nfce", tags=["NFC-e"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 12 * 1024 * 1024


@router.post("/preview", response_model=NfcePreviewResponse)
async def preview_nfce(file: UploadFile = File(...)) -> NfcePreviewResponse:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Envie uma imagem JPG, PNG ou WEBP.",
        )

    image_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    await file.close()

    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="A imagem excede o limite de 12 MB.",
        )

    try:
        qr_text = await run_in_threadpool(decode_qr_from_bytes, image_bytes)
    except InvalidImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if not qr_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Não encontrei um QR Code legível. Aproxime a câmera, evite reflexos "
                "e mantenha o código inteiro dentro da imagem."
            ),
        )

    result = await run_in_threadpool(consultar_nfce_por_qrcode, qr_text)
    return NfcePreviewResponse(
        qr_texto=qr_text,
        chave_nfce=extrair_chave_nfce(qr_text),
        **result,
    )
