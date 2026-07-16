from typing import Any

import requests

from app.core.config import settings


class SupabaseConfiguracoesError(Exception):
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
    return "Não foi possível atualizar as configurações da família."


def _rpc_post(
    function_name: str,
    access_token: str,
    parameters: dict[str, Any] | None = None,
) -> Any:
    if not settings.supabase_configured:
        raise SupabaseConfiguracoesError(
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
        raise SupabaseConfiguracoesError(
            "Não foi possível acessar o banco online. Tente novamente em instantes.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code in {401, 403}:
        raise SupabaseConfiguracoesError(
            "Sua sessão expirou ou não possui permissão para esta ação.",
            status_code=401 if response.status_code == 401 else 403,
        )

    if response.status_code >= 400:
        message = _error_message(payload)
        normalized = message.casefold()

        if "não encontrado" in normalized or "nao encontrado" in normalized:
            raise SupabaseConfiguracoesError(message, status_code=404)
        if "apenas administradores" in normalized or "não possui permissão" in normalized:
            raise SupabaseConfiguracoesError(message, status_code=403)
        if response.status_code in {400, 409, 422}:
            raise SupabaseConfiguracoesError(message, status_code=422)
        raise SupabaseConfiguracoesError(message, status_code=503)

    if isinstance(payload, list):
        return payload[0] if payload else None
    return payload


def obter_configuracoes_familia(access_token: str) -> dict[str, Any]:
    payload = _rpc_post("obter_configuracoes_familia", access_token)
    if not isinstance(payload, dict) or not isinstance(payload.get("familia"), dict):
        raise SupabaseConfiguracoesError(
            "O banco retornou configurações inválidas.",
            status_code=503,
        )
    return payload


def atualizar_meu_perfil(nome: str, access_token: str) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post("atualizar_meu_perfil", access_token, {"p_nome": nome}),
    )


def atualizar_nome_familia(nome: str, access_token: str) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post("atualizar_nome_familia", access_token, {"p_nome": nome}),
    )


def criar_convite_familia(
    email: str,
    papel: str,
    access_token: str,
) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "criar_convite_familia",
            access_token,
            {"p_email": email, "p_papel": papel},
        ),
    )


def cancelar_convite_familia(convite_id: str, access_token: str) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "cancelar_convite_familia",
            access_token,
            {"p_convite_id": convite_id},
        ),
    )


def aceitar_convite_familia(convite_id: str, access_token: str) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "aceitar_convite_familia",
            access_token,
            {"p_convite_id": convite_id},
        ),
    )


def selecionar_familia_atual(familia_id: str, access_token: str) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "selecionar_familia_atual",
            access_token,
            {"p_familia_id": familia_id},
        ),
    )


def alterar_papel_membro_familia(
    usuario_id: str,
    papel: str,
    access_token: str,
) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "alterar_papel_membro_familia",
            access_token,
            {"p_usuario_id": usuario_id, "p_papel": papel},
        ),
    )


def remover_membro_familia(usuario_id: str, access_token: str) -> dict[str, Any]:
    return _ensure_dict(
        _rpc_post(
            "remover_membro_familia",
            access_token,
            {"p_usuario_id": usuario_id},
        ),
    )


def _ensure_dict(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise SupabaseConfiguracoesError(
            "O banco retornou uma resposta inválida.",
            status_code=503,
        )
    return payload
