from __future__ import annotations

from dataclasses import dataclass
from datetime import date
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
    return "Não foi possível acessar as compras no banco online."


def _rpc_post(
    function_name: str,
    access_token: str,
    parameters: dict[str, Any],
) -> Any:
    if not settings.supabase_configured:
        raise SupabasePurchaseError(
            "Supabase ainda não foi configurado no backend.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function_name}",
            headers=_headers(access_token),
            json=parameters,
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
        if "não encontrada nesta família" in normalized or "nao encontrada nesta familia" in normalized:
            raise SupabasePurchaseError(message, status_code=404)
        if "somente administradores" in normalized:
            raise SupabasePurchaseError(message, status_code=403)
        if response.status_code in {400, 409, 422}:
            raise SupabasePurchaseError(message, status_code=422)
        raise SupabasePurchaseError(message, status_code=503)

    return payload


def registrar_compra_nfce(
    purchase: CompraNfceCreate,
    access_token: str,
) -> dict[str, Any]:
    payload = _rpc_post(
        "registrar_compra_nfce",
        access_token,
        {"p_payload": purchase.model_dump(mode="json")},
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not payload.get("compra_id"):
        raise SupabasePurchaseError(
            "O banco confirmou a operação, mas não retornou a compra registrada.",
            status_code=503,
        )

    return payload


def listar_compras_familia(
    access_token: str,
    limite: int = 20,
    offset: int = 0,
    supermercado_id: str | None = None,
    mes: date | None = None,
) -> dict[str, Any]:
    requested_limit = max(1, min(limite, 100))
    requested_offset = max(offset, 0)

    payload = _rpc_post(
        "listar_compras_familia",
        access_token,
        {
            "p_limite": requested_limit + 1,
            "p_offset": requested_offset,
            "p_supermercado_id": supermercado_id,
            "p_mes": mes.isoformat() if mes else None,
        },
    )

    if not isinstance(payload, list):
        raise SupabasePurchaseError(
            "O banco retornou uma lista de compras inválida.",
            status_code=503,
        )

    tem_mais = len(payload) > requested_limit
    compras = payload[:requested_limit]

    return {
        "compras": compras,
        "limite": requested_limit,
        "offset": requested_offset,
        "proximo_offset": requested_offset + requested_limit if tem_mais else None,
        "tem_mais": tem_mais,
    }


def detalhar_compra_familia(
    compra_id: str,
    access_token: str,
) -> dict[str, Any]:
    payload = _rpc_post(
        "detalhar_compra_familia",
        access_token,
        {"p_compra_id": compra_id},
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not payload.get("id"):
        raise SupabasePurchaseError(
            "O banco não retornou os detalhes da compra.",
            status_code=503,
        )

    return payload


def excluir_compra_teste(
    compra_id: str,
    confirmacao: str,
    access_token: str,
) -> dict[str, Any]:
    payload = _rpc_post(
        "excluir_compra_teste",
        access_token,
        {
            "p_compra_id": compra_id,
            "p_confirmacao": confirmacao,
        },
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not payload.get("compra_id"):
        raise SupabasePurchaseError(
            "O banco não confirmou a exclusão da compra.",
            status_code=503,
        )

    return payload
