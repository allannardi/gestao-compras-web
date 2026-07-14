from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

from app.core.config import settings
from app.schemas.compras import CompraNfceCreate


@dataclass(frozen=True)
class SupabasePurchaseError(Exception):
    message: str
    status_code: int = 503

    def __str__(self) -> str:
        return self.message


def _headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "apikey": settings.supabase_publishable_key,
        "Content-Type": "application/json",
    }


def _error_message(payload: Any) -> str:
    if isinstance(payload, dict):
        for key in ("message", "details", "hint", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return "Não foi possível registrar a compra no banco online."


def registrar_compra_nfce(
    purchase: CompraNfceCreate,
    access_token: str,
) -> dict[str, Any]:
    if not settings.supabase_configured:
        raise SupabasePurchaseError(
            "Supabase ainda não foi configurado no backend.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/registrar_compra_nfce",
            headers=_headers(access_token),
            json={"p_payload": purchase.model_dump(mode="json")},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise SupabasePurchaseError(
            "Não foi possível acessar o banco online. Tente novamente em instantes.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        raise SupabasePurchaseError(
            "Sua sessão expirou ou não possui acesso à família.",
            status_code=401,
        )

    if response.status_code >= 400:
        message = _error_message(payload)
        normalized = message.casefold()
        if "já foi registrada" in normalized or "ja foi registrada" in normalized:
            raise SupabasePurchaseError(message, status_code=409)
        if response.status_code in {400, 409, 422}:
            raise SupabasePurchaseError(message, status_code=422)
        raise SupabasePurchaseError(message, status_code=503)

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not payload.get("compra_id"):
        raise SupabasePurchaseError(
            "O banco confirmou a operação, mas não retornou a compra registrada.",
            status_code=503,
        )

    return payload
