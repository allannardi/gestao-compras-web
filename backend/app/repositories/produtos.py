from __future__ import annotations

from typing import Any

import requests

from app.core.config import settings
from app.schemas.produtos import ProdutoUpdate


class SupabaseProductError(Exception):
    def __init__(self, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


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
    return "Não foi possível acessar os produtos no banco online."


def _rpc_post(
    function_name: str,
    access_token: str,
    parameters: dict[str, Any],
) -> Any:
    if not settings.supabase_configured:
        raise SupabaseProductError(
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
        raise SupabaseProductError(
            "Não foi possível acessar o banco online. Tente novamente em instantes.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        raise SupabaseProductError(
            "Sua sessão expirou ou não possui acesso à família.",
            status_code=401,
        )

    if response.status_code >= 400:
        message = _error_message(payload)
        normalized = message.casefold()
        if "não encontrado nesta família" in normalized or "nao encontrado nesta familia" in normalized:
            raise SupabaseProductError(message, status_code=404)
        if "já existe" in normalized or "ja existe" in normalized:
            raise SupabaseProductError(message, status_code=409)
        if response.status_code in {400, 409, 422}:
            raise SupabaseProductError(message, status_code=422)
        raise SupabaseProductError(message, status_code=503)

    return payload


def listar_produtos_familia(
    access_token: str,
    limite: int = 20,
    offset: int = 0,
    busca: str = "",
    somente_revisar: bool = False,
    categoria_id: str | None = None,
) -> dict[str, Any]:
    requested_limit = max(1, min(limite, 100))
    requested_offset = max(offset, 0)

    payload = _rpc_post(
        "listar_produtos_familia",
        access_token,
        {
            "p_limite": requested_limit,
            "p_offset": requested_offset,
            "p_busca": busca.strip() or None,
            "p_somente_revisar": somente_revisar,
            "p_categoria_id": categoria_id,
        },
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not isinstance(payload.get("produtos"), list):
        raise SupabaseProductError(
            "O banco retornou uma lista de produtos inválida.",
            status_code=503,
        )

    return payload


def listar_categorias_familia(access_token: str) -> list[dict[str, Any]]:
    payload = _rpc_post("listar_categorias_familia", access_token, {})

    if isinstance(payload, list) and len(payload) == 1 and isinstance(payload[0], list):
        payload = payload[0]

    if not isinstance(payload, list):
        raise SupabaseProductError(
            "O banco retornou uma lista de categorias inválida.",
            status_code=503,
        )

    return payload


def atualizar_produto_familia(
    produto_id: str,
    product: ProdutoUpdate,
    access_token: str,
) -> dict[str, Any]:
    payload = _rpc_post(
        "atualizar_produto_familia",
        access_token,
        {
            "p_produto_id": produto_id,
            "p_payload": product.model_dump(mode="json"),
        },
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not payload.get("id"):
        raise SupabaseProductError(
            "O banco não confirmou a atualização do produto.",
            status_code=503,
        )

    return payload


def criar_categoria_familia(nome: str, access_token: str) -> dict[str, Any]:
    payload = _rpc_post(
        "criar_categoria_familia",
        access_token,
        {"p_nome": nome},
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not payload.get("id"):
        raise SupabaseProductError(
            "O banco não confirmou a categoria.",
            status_code=503,
        )

    return payload


def reclassificar_produtos_familia(access_token: str) -> dict[str, Any]:
    payload = _rpc_post("reclassificar_produtos_familia", access_token, {})

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict):
        raise SupabaseProductError(
            "O banco não confirmou a reclassificação.",
            status_code=503,
        )

    return payload
