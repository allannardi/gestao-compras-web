from typing import Any

import requests

from app.core.config import settings


class SupabaseConvitesError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _headers(access_token: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def _error_message(payload: Any) -> str:
    if isinstance(payload, dict):
        for key in ("message", "details", "hint", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return "Não foi possível consultar o convite."


def _rpc_post(
    function_name: str,
    parameters: dict[str, Any],
    access_token: str | None = None,
) -> Any:
    if not settings.supabase_configured:
        raise SupabaseConvitesError(
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
        raise SupabaseConvitesError(
            "Não foi possível acessar o banco online. Tente novamente em instantes.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        raise SupabaseConvitesError(
            "Sua sessão expirou ou este convite pertence a outro e-mail.",
            status_code=response.status_code,
        )

    if response.status_code >= 400:
        message = _error_message(payload)
        normalized = message.casefold()
        if "expir" in normalized:
            status_code = 410
        elif "não encontrado" in normalized or "nao encontrado" in normalized:
            status_code = 404
        elif "já foi utilizado" in normalized or "ja foi utilizado" in normalized:
            status_code = 409
        elif response.status_code in {400, 409, 422}:
            status_code = 422
        else:
            status_code = 503
        raise SupabaseConvitesError(message, status_code=status_code)

    if isinstance(payload, list):
        return payload[0] if payload else None
    return payload


def consultar_convite_publico(token: str) -> dict[str, Any]:
    payload = _rpc_post(
        "consultar_convite_publico",
        {"p_token": token},
    )
    if not isinstance(payload, dict):
        raise SupabaseConvitesError(
            "O banco retornou um convite inválido.",
            status_code=503,
        )
    return payload


def aceitar_convite_por_token(
    token: str,
    access_token: str,
) -> dict[str, Any]:
    payload = _rpc_post(
        "aceitar_convite_por_token",
        {"p_token": token},
        access_token=access_token,
    )
    if not isinstance(payload, dict):
        raise SupabaseConvitesError(
            "O banco retornou uma resposta inválida.",
            status_code=503,
        )
    return payload
