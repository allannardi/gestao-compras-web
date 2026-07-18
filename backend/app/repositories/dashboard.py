from __future__ import annotations

from datetime import date
from typing import Any

import requests

from app.core.config import settings


class SupabaseDashboardError(Exception):
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
    return "Não foi possível acessar os indicadores no banco online."


def _rpc_post(
    function_name: str,
    access_token: str,
    parameters: dict[str, Any],
) -> Any:
    if not settings.supabase_configured:
        raise SupabaseDashboardError(
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
        raise SupabaseDashboardError(
            "Não foi possível acessar o banco online. Tente novamente em instantes.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        raise SupabaseDashboardError(
            "Sua sessão expirou ou não possui acesso à família.",
            status_code=401,
        )

    if response.status_code >= 400:
        message = _error_message(payload)
        normalized = message.casefold()
        if "não encontrado nesta família" in normalized or "nao encontrado nesta familia" in normalized:
            raise SupabaseDashboardError(message, status_code=404)
        if response.status_code in {400, 409, 422}:
            raise SupabaseDashboardError(message, status_code=422)
        raise SupabaseDashboardError(message, status_code=503)

    return payload


def listar_supermercados_familia(access_token: str) -> list[dict[str, Any]]:
    payload = _rpc_post("listar_supermercados_familia", access_token, {})

    if isinstance(payload, list) and len(payload) == 1 and isinstance(payload[0], list):
        payload = payload[0]

    if not isinstance(payload, list):
        raise SupabaseDashboardError(
            "O banco retornou uma lista de supermercados inválida.",
            status_code=503,
        )

    return payload


def obter_dashboard_familia(
    access_token: str,
    mes: date | None = None,
) -> dict[str, Any]:
    payload = _rpc_post(
        "obter_dashboard_familia",
        access_token,
        {"p_mes": mes.isoformat() if mes else None},
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not isinstance(payload.get("resumo"), dict):
        raise SupabaseDashboardError(
            "O banco retornou um dashboard inválido.",
            status_code=503,
        )

    return payload


def buscar_produtos_historico_familia(
    access_token: str,
    busca: str = "",
    limite: int = 200,
) -> list[dict[str, Any]]:
    requested_limit = max(1, min(limite, 200))
    payload = _rpc_post(
        "buscar_produtos_historico_familia",
        access_token,
        {
            "p_busca": busca.strip() or None,
            "p_limite": requested_limit,
        },
    )

    if isinstance(payload, list) and len(payload) == 1 and isinstance(payload[0], list):
        payload = payload[0]

    if not isinstance(payload, list):
        raise SupabaseDashboardError(
            "O banco retornou uma lista de produtos inválida.",
            status_code=503,
        )

    return payload


def obter_historico_produto_familia(
    produto_id: str,
    access_token: str,
    limite: int = 30,
) -> dict[str, Any]:
    requested_limit = max(2, min(limite, 100))
    payload = _rpc_post(
        "obter_historico_produto_familia",
        access_token,
        {
            "p_produto_id": produto_id,
            "p_limite": requested_limit,
        },
    )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict) or not isinstance(payload.get("produto"), dict):
        raise SupabaseDashboardError(
            "O banco não retornou o histórico do produto.",
            status_code=503,
        )

    return payload
