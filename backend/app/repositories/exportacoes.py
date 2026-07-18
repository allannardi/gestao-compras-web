from typing import Any

import requests

from app.core.config import settings


class SupabaseExportacaoError(Exception):
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


def _error_message(payload: Any) -> str:
    if isinstance(payload, dict):
        for key in ("message", "details", "hint", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return "Não foi possível preparar a exportação da família."


def _rpc_post(function_name: str, access_token: str) -> dict[str, Any]:
    if not settings.supabase_configured:
        raise SupabaseExportacaoError(
            "Supabase ainda não foi configurado no backend.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function_name}",
            headers=_headers(access_token),
            json={},
            timeout=max(settings.supabase_request_timeout_seconds, 60.0),
        )
    except requests.RequestException as exc:
        raise SupabaseExportacaoError(
            "Não foi possível acessar o banco online para gerar a exportação.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        message = _error_message(payload)
        raise SupabaseExportacaoError(
            message
            if message != "Não foi possível preparar a exportação da família."
            else "Sua sessão expirou ou não possui permissão para exportar.",
            status_code=response.status_code,
        )

    if response.status_code >= 400:
        message = _error_message(payload)
        normalized = message.casefold()
        if "somente administradores" in normalized:
            raise SupabaseExportacaoError(message, status_code=403)
        if "não foi encontrada" in normalized or "nao foi encontrada" in normalized:
            raise SupabaseExportacaoError(message, status_code=404)
        if response.status_code in {400, 409, 422}:
            raise SupabaseExportacaoError(message, status_code=422)
        raise SupabaseExportacaoError(message, status_code=503)

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict):
        raise SupabaseExportacaoError(
            "O banco retornou uma exportação inválida.",
            status_code=503,
        )

    return payload


def obter_resumo_exportacao_familia(access_token: str) -> dict[str, Any]:
    return _rpc_post("obter_resumo_exportacao_familia", access_token)


def obter_backup_exportacao_familia(access_token: str) -> dict[str, Any]:
    payload = _rpc_post("obter_backup_exportacao_familia", access_token)
    required_lists = (
        "membros",
        "categorias",
        "supermercados",
        "produtos",
        "compras",
        "itens_compra",
        "historico_precos",
    )
    if not isinstance(payload.get("familia"), dict) or any(
        not isinstance(payload.get(key), list) for key in required_lists
    ):
        raise SupabaseExportacaoError(
            "O banco retornou dados incompletos para o backup.",
            status_code=503,
        )
    return payload
