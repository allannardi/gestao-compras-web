from typing import Any

import requests

from app.core.config import settings


class SupabaseCadastrosError(Exception):
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
    return "Não foi possível atualizar os cadastros da família."


def _rpc_post(
    function_name: str,
    access_token: str,
    parameters: dict[str, Any] | None = None,
) -> Any:
    if not settings.supabase_configured:
        raise SupabaseCadastrosError(
            "Supabase ainda não foi configurado no backend.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function_name}",
            headers=_headers(access_token),
            json=parameters or {},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise SupabaseCadastrosError(
            "Não foi possível acessar o banco online. Tente novamente em instantes.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        message = _error_message(payload)
        raise SupabaseCadastrosError(
            message if message != "Não foi possível atualizar os cadastros da família." else "Sua sessão expirou ou não possui permissão para esta ação.",
            status_code=response.status_code,
        )

    if response.status_code >= 400:
        message = _error_message(payload)
        normalized = message.casefold()
        if "não encontrado" in normalized or "nao encontrado" in normalized:
            raise SupabaseCadastrosError(message, status_code=404)
        if "apenas administradores" in normalized or "não possui permissão" in normalized:
            raise SupabaseCadastrosError(message, status_code=403)
        if "já existe" in normalized or "ja existe" in normalized:
            raise SupabaseCadastrosError(message, status_code=409)
        if response.status_code in {400, 409, 422}:
            raise SupabaseCadastrosError(message, status_code=422)
        raise SupabaseCadastrosError(message, status_code=503)

    if isinstance(payload, list):
        return payload[0] if payload else None
    return payload


def _ensure_dict(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise SupabaseCadastrosError(
            "O banco retornou uma resposta inválida.",
            status_code=503,
        )
    return payload


def obter_cadastros_familia(access_token: str) -> dict[str, Any]:
    payload = _ensure_dict(_rpc_post("obter_cadastros_familia", access_token))
    if not isinstance(payload.get("categorias"), list) or not isinstance(
        payload.get("supermercados"), list
    ):
        raise SupabaseCadastrosError(
            "O banco retornou cadastros inválidos.",
            status_code=503,
        )
    return payload


def atualizar_categoria_cadastro(
    categoria_id: str,
    nome: str,
    access_token: str,
) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "atualizar_categoria_cadastro",
            access_token,
            {"p_categoria_id": categoria_id, "p_nome": nome},
        )
    )


def desativar_categoria_cadastro(
    categoria_id: str,
    categoria_destino_id: str,
    access_token: str,
) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "desativar_categoria_cadastro",
            access_token,
            {
                "p_categoria_id": categoria_id,
                "p_categoria_destino_id": categoria_destino_id,
            },
        )
    )


def reativar_categoria_cadastro(
    categoria_id: str,
    access_token: str,
) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "reativar_categoria_cadastro",
            access_token,
            {"p_categoria_id": categoria_id},
        )
    )


def atualizar_supermercado_cadastro(
    supermercado_id: str,
    nome: str,
    access_token: str,
) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "atualizar_supermercado_cadastro",
            access_token,
            {"p_supermercado_id": supermercado_id, "p_nome": nome},
        )
    )


def mesclar_supermercados_cadastro(
    supermercado_origem_id: str,
    supermercado_destino_id: str,
    access_token: str,
) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "mesclar_supermercados_cadastro",
            access_token,
            {
                "p_supermercado_origem_id": supermercado_origem_id,
                "p_supermercado_destino_id": supermercado_destino_id,
            },
        )
    )
