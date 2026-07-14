from dataclasses import dataclass, field
from typing import Any

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str
    access_token: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class FamilyContext:
    user_id: str
    email: str
    nome: str
    familia_id: str
    familia_nome: str
    papel: str
    access_token: str = ""


def _supabase_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "apikey": settings.supabase_publishable_key,
        "Content-Type": "application/json",
    }


def _ensure_supabase_configured() -> None:
    if not settings.supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase ainda não foi configurado no backend.",
        )


def _fetch_user(access_token: str) -> AuthenticatedUser:
    _ensure_supabase_configured()

    try:
        response = requests.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers=_supabase_headers(access_token),
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível validar a sessão no Supabase.",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O Supabase retornou uma resposta inválida ao validar a sessão.",
        ) from exc

    user_id = str(payload.get("id") or "")
    email = str(payload.get("email") or "")
    metadata = payload.get("user_metadata")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não identificado.",
        )

    return AuthenticatedUser(
        id=user_id,
        email=email,
        access_token=access_token,
        metadata=metadata if isinstance(metadata, dict) else {},
    )


def _fetch_family_context(user: AuthenticatedUser) -> FamilyContext:
    _ensure_supabase_configured()

    try:
        response = requests.post(
            f"{settings.supabase_url.rstrip('/')}/rest/v1/rpc/meu_contexto",
            headers=_supabase_headers(user.access_token),
            json={},
            timeout=settings.supabase_request_timeout_seconds,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível carregar os dados da família.",
        ) from exc

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou sem acesso à família.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Não foi possível carregar a estrutura da família. "
                "Confirme se a migration v0.3.0 foi executada no Supabase."
            ),
        )

    try:
        payload: Any = response.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O Supabase retornou uma resposta inválida para a família.",
        ) from exc

    if isinstance(payload, list):
        context = payload[0] if payload else None
    elif isinstance(payload, dict):
        context = payload
    else:
        context = None

    if not isinstance(context, dict) or not context.get("familia_id"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Sua sessão existe, mas a família ainda não foi preparada. "
                "Saia, entre novamente e confirme se o SQL da v0.3.0 foi executado."
            ),
        )

    return FamilyContext(
        user_id=str(context.get("user_id") or user.id),
        email=str(context.get("email") or user.email),
        nome=str(context.get("nome") or user.metadata.get("nome") or "Usuário"),
        familia_id=str(context.get("familia_id") or ""),
        familia_nome=str(context.get("familia_nome") or "Minha família"),
        papel=str(context.get("papel") or "membro"),
        access_token=user.access_token,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faça login para continuar.",
        )

    return _fetch_user(credentials.credentials)


def get_current_family_context(
    user: AuthenticatedUser = Depends(get_current_user),
) -> FamilyContext:
    return _fetch_family_context(user)
