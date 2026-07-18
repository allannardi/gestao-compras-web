from typing import Any

import requests

from app.core.config import settings


class SupabaseBetaError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "apikey": settings.supabase_publishable_key,
        "Content-Type": "application/json",
    }


def _error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        for key in ("message", "details", "hint", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return fallback


def _rpc(function_name: str, access_token: str) -> dict[str, Any]:
    if not settings.supabase_configured:
        raise SupabaseBetaError(
            "Supabase ainda não foi configurado no backend.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function_name}",
            headers=_headers(access_token),
            json={},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise SupabaseBetaError(
            "Não foi possível acessar o banco online.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        raise SupabaseBetaError(
            "Sua sessão expirou ou não possui acesso a esta informação.",
            status_code=response.status_code,
        )

    if response.status_code >= 400:
        raise SupabaseBetaError(
            _error_message(payload, "Não foi possível carregar a preparação para beta."),
            status_code=422 if response.status_code < 500 else 503,
        )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict):
        raise SupabaseBetaError(
            "O banco retornou uma resposta inválida.",
            status_code=503,
        )

    return payload


def obter_onboarding_beta(access_token: str) -> dict[str, Any]:
    return _rpc("obter_onboarding_beta", access_token)


def concluir_onboarding_beta(access_token: str) -> dict[str, Any]:
    return _rpc("concluir_onboarding_beta", access_token)


def registrar_visualizacao_privacidade(access_token: str) -> dict[str, Any]:
    return _rpc("registrar_visualizacao_privacidade", access_token)
