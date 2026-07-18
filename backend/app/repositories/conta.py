from typing import Any

import requests

from app.core.config import settings


class SupabaseContaError(Exception):
    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _user_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "apikey": settings.supabase_publishable_key,
        "Content-Type": "application/json",
    }


def _admin_headers() -> dict[str, str]:
    secret_key = settings.supabase_secret_key.strip()
    return {
        "Authorization": f"Bearer {secret_key}",
        "apikey": secret_key,
        "Content-Type": "application/json",
    }


def _error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        for key in (
            "message",
            "msg",
            "details",
            "hint",
            "error_description",
            "error",
        ):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return fallback


def _map_status(response_status: int, message: str) -> int:
    normalized = message.casefold()
    if response_status == 401:
        return 401
    if response_status == 403 or "apenas administradores" in normalized:
        return 403
    if "não encontr" in normalized or "nao encontr" in normalized:
        return 404
    if response_status in {400, 409, 422} or response_status < 500:
        return 422
    return 503


def _rpc(
    function_name: str,
    access_token: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    if not settings.supabase_configured:
        raise SupabaseContaError(
            "Supabase ainda não foi configurado no backend.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function_name}",
            headers=_user_headers(access_token),
            json=parameters,
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise SupabaseContaError(
            "Não foi possível acessar o banco online.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code >= 400:
        message = _error_message(payload, "Não foi possível concluir a exclusão.")
        raise SupabaseContaError(
            message,
            status_code=_map_status(response.status_code, message),
        )

    if isinstance(payload, list):
        payload = payload[0] if payload else None

    if not isinstance(payload, dict):
        raise SupabaseContaError(
            "O banco retornou uma resposta inválida.",
            status_code=503,
        )

    return payload


def excluir_minha_conta(
    user_id: str,
    email_confirmacao: str,
    access_token: str,
) -> dict[str, Any]:
    preflight = _rpc(
        "preparar_exclusao_minha_conta",
        access_token,
        {"p_email_confirmacao": email_confirmacao},
    )

    if not preflight.get("pode_excluir"):
        raise SupabaseContaError(
            "A conta não pode ser excluída neste momento.",
            status_code=422,
        )

    if str(preflight.get("usuario_id") or "") != user_id:
        raise SupabaseContaError(
            "A confirmação de segurança não corresponde à sessão atual.",
            status_code=403,
        )

    if not settings.supabase_admin_configured:
        raise SupabaseContaError(
            "A exclusão de conta ainda não foi habilitada no servidor. "
            "Configure SUPABASE_SECRET_KEY no Render.",
            status_code=503,
        )

    try:
        response = requests.delete(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
            headers=_admin_headers(),
            params={"should_soft_delete": "false"},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise SupabaseContaError(
            "Não foi possível excluir a conta no serviço de autenticação.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code not in {200, 204, 404}:
        message = _error_message(
            payload,
            "Não foi possível excluir a conta no serviço de autenticação.",
        )
        raise SupabaseContaError(
            message,
            status_code=_map_status(response.status_code, message),
        )

    return {
        "mensagem": "Sua conta foi excluída com sucesso.",
        "familias_excluidas": int(preflight.get("familias_exclusivas_count") or 0),
    }


def excluir_familia_atual(
    nome_confirmacao: str,
    access_token: str,
) -> dict[str, Any]:
    return _rpc(
        "excluir_familia_atual",
        access_token,
        {"p_nome_confirmacao": nome_confirmacao},
    )
