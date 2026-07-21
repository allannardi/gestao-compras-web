from typing import Any

import requests

from app.core.config import settings


class SupabaseAdminGeralError(Exception):
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


def _status_for_error(response_status: int, message: str) -> int:
    normalized = message.casefold()
    if response_status == 401:
        return 401
    if response_status == 403 or "admin geral" in normalized or "permissão" in normalized:
        return 403
    if "não encontr" in normalized or "nao encontr" in normalized:
        return 404
    if response_status == 429:
        return 429
    if response_status in {400, 409, 422} or response_status < 500:
        return 422
    return 503


def _rpc(
    function_name: str,
    access_token: str,
    parameters: dict[str, Any] | None = None,
) -> Any:
    if not settings.supabase_configured:
        raise SupabaseAdminGeralError(
            "Supabase ainda não foi configurado no backend.",
            status_code=503,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/{function_name}",
            headers=_user_headers(access_token),
            json=parameters or {},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise SupabaseAdminGeralError(
            "Não foi possível acessar o banco online.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code >= 400:
        message = _error_message(
            payload,
            "Não foi possível concluir a ação no Admin Geral.",
        )
        raise SupabaseAdminGeralError(
            message,
            status_code=_status_for_error(response.status_code, message),
        )

    if isinstance(payload, list):
        return payload[0] if payload else None
    return payload


def _dict(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise SupabaseAdminGeralError(
            "O banco retornou uma resposta administrativa inválida.",
            status_code=503,
        )
    return payload


def obter_acesso_admin_geral(access_token: str) -> dict[str, Any]:
    return _dict(_rpc("meu_acesso_admin_geral", access_token))


def obter_resumo_admin_geral(access_token: str) -> dict[str, Any]:
    return _dict(_rpc("admin_resumo_sistema", access_token))


def listar_familias_admin(
    access_token: str,
    busca: str | None,
    situacao: str | None,
    limite: int,
    offset: int,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_listar_familias",
            access_token,
            {
                "p_busca": busca,
                "p_status": situacao,
                "p_limite": limite,
                "p_offset": offset,
            },
        )
    )


def detalhar_familia_admin(familia_id: str, access_token: str) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_detalhar_familia",
            access_token,
            {"p_familia_id": familia_id},
        )
    )


def atualizar_familia_admin(
    familia_id: str,
    nome: str | None,
    observacao: str | None,
    access_token: str,
    origem_ip: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_atualizar_familia",
            access_token,
            {
                "p_familia_id": familia_id,
                "p_nome": nome,
                "p_observacao": observacao,
                "p_origem_ip": origem_ip,
                "p_request_id": request_id,
            },
        )
    )


def alterar_status_familia_admin(
    familia_id: str,
    situacao: str,
    motivo: str,
    access_token: str,
    origem_ip: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_alterar_status_familia",
            access_token,
            {
                "p_familia_id": familia_id,
                "p_status": situacao,
                "p_motivo": motivo,
                "p_origem_ip": origem_ip,
                "p_request_id": request_id,
            },
        )
    )


def excluir_familia_admin(
    familia_id: str,
    nome_confirmacao: str,
    confirmacao: str,
    motivo: str,
    access_token: str,
    origem_ip: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_excluir_familia_definitivamente",
            access_token,
            {
                "p_familia_id": familia_id,
                "p_nome_confirmacao": nome_confirmacao,
                "p_confirmacao": confirmacao,
                "p_motivo": motivo,
                "p_origem_ip": origem_ip,
                "p_request_id": request_id,
            },
        )
    )


def listar_usuarios_admin(
    access_token: str,
    busca: str | None,
    limite: int,
    offset: int,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_listar_usuarios",
            access_token,
            {"p_busca": busca, "p_limite": limite, "p_offset": offset},
        )
    )


def detalhar_usuario_admin(usuario_id: str, access_token: str) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_detalhar_usuario",
            access_token,
            {"p_usuario_id": usuario_id},
        )
    )


def alterar_papel_membro_admin(
    familia_id: str,
    usuario_id: str,
    papel: str,
    access_token: str,
    origem_ip: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_alterar_papel_membro",
            access_token,
            {
                "p_familia_id": familia_id,
                "p_usuario_id": usuario_id,
                "p_papel": papel,
                "p_origem_ip": origem_ip,
                "p_request_id": request_id,
            },
        )
    )


def remover_membro_admin(
    familia_id: str,
    usuario_id: str,
    access_token: str,
    origem_ip: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_remover_membro_familia",
            access_token,
            {
                "p_familia_id": familia_id,
                "p_usuario_id": usuario_id,
                "p_origem_ip": origem_ip,
                "p_request_id": request_id,
            },
        )
    )


def solicitar_redefinicao_senha_admin(
    usuario_id: str,
    access_token: str,
    origem_ip: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    user = _dict(
        _rpc(
            "admin_preparar_redefinicao_usuario",
            access_token,
            {
                "p_usuario_id": usuario_id,
                "p_origem_ip": origem_ip,
                "p_request_id": request_id,
            },
        )
    )

    email = str(user.get("email") or "").strip().lower()
    nome = str(user.get("nome") or "Usuário").strip() or "Usuário"
    if not email:
        raise SupabaseAdminGeralError(
            "O usuário não possui um e-mail válido para redefinição.",
            status_code=422,
        )

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/recover",
            headers={
                "apikey": settings.supabase_publishable_key,
                "Content-Type": "application/json",
            },
            params={"redirect_to": settings.password_recovery_redirect_url},
            json={"email": email},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise SupabaseAdminGeralError(
            "Não foi possível enviar o e-mail de redefinição.",
            status_code=503,
        ) from exc

    try:
        payload: Any = response.json()
    except ValueError:
        payload = None

    if response.status_code >= 400:
        message = _error_message(payload, "Não foi possível enviar o e-mail de redefinição.")
        raise SupabaseAdminGeralError(
            message,
            status_code=_status_for_error(response.status_code, message),
        )

    return {"mensagem": f"E-mail de redefinição enviado para {nome} ({email})."}


def excluir_usuario_admin(
    usuario_id: str,
    email_confirmacao: str,
    confirmacao: str,
    motivo: str,
    access_token: str,
    origem_ip: str | None,
    request_id: str | None,
) -> dict[str, Any]:
    preflight = _dict(
        _rpc(
            "admin_preparar_exclusao_usuario",
            access_token,
            {
                "p_usuario_id": usuario_id,
                "p_email_confirmacao": email_confirmacao,
                "p_confirmacao": confirmacao,
                "p_motivo": motivo,
                "p_origem_ip": origem_ip,
                "p_request_id": request_id,
            },
        )
    )

    if not settings.supabase_admin_configured:
        _rpc(
            "admin_finalizar_exclusao_usuario",
            access_token,
            {
                "p_usuario_id": usuario_id,
                "p_auditoria_id": preflight.get("auditoria_id"),
                "p_sucesso": False,
                "p_detalhe": "SUPABASE_SECRET_KEY não configurada no backend.",
            },
        )
        raise SupabaseAdminGeralError(
            "A exclusão definitiva exige SUPABASE_SECRET_KEY configurada no Render.",
            status_code=503,
        )

    try:
        response = requests.delete(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{usuario_id}",
            headers=_admin_headers(),
            params={"should_soft_delete": "false"},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        _rpc(
            "admin_finalizar_exclusao_usuario",
            access_token,
            {
                "p_usuario_id": usuario_id,
                "p_auditoria_id": preflight.get("auditoria_id"),
                "p_sucesso": False,
                "p_detalhe": "Falha de conexão com o Supabase Auth.",
            },
        )
        raise SupabaseAdminGeralError(
            "Não foi possível acessar o serviço de autenticação.",
            status_code=503,
        ) from exc

    try:
        auth_payload: Any = response.json()
    except ValueError:
        auth_payload = None

    if response.status_code not in {200, 204, 404}:
        message = _error_message(
            auth_payload,
            "Não foi possível excluir o usuário no serviço de autenticação.",
        )
        _rpc(
            "admin_finalizar_exclusao_usuario",
            access_token,
            {
                "p_usuario_id": usuario_id,
                "p_auditoria_id": preflight.get("auditoria_id"),
                "p_sucesso": False,
                "p_detalhe": message,
            },
        )
        raise SupabaseAdminGeralError(
            message,
            status_code=_status_for_error(response.status_code, message),
        )

    result = _dict(
        _rpc(
            "admin_finalizar_exclusao_usuario",
            access_token,
            {
                "p_usuario_id": usuario_id,
                "p_auditoria_id": preflight.get("auditoria_id"),
                "p_sucesso": True,
                "p_detalhe": "Exclusão confirmada no Supabase Auth.",
            },
        )
    )
    result["familias_excluidas"] = int(preflight.get("familias_exclusivas_count") or 0)
    return result


def listar_auditoria_admin(
    access_token: str,
    busca: str | None,
    limite: int,
    offset: int,
) -> dict[str, Any]:
    return _dict(
        _rpc(
            "admin_listar_auditoria",
            access_token,
            {"p_busca": busca, "p_limite": limite, "p_offset": offset},
        )
    )
