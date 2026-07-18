from fastapi.testclient import TestClient

from app.api.v1.endpoints import conta as endpoint
from app.core.auth import (
    AuthenticatedUser,
    FamilyContext,
    get_current_family_context,
    get_current_user,
)
from app.main import app

client = TestClient(app)


def _user() -> AuthenticatedUser:
    return AuthenticatedUser(
        id="11111111-1111-4111-8111-111111111111",
        email="allan@example.com",
        access_token="fresh-token",
    )


def _context() -> FamilyContext:
    return FamilyContext(
        user_id="11111111-1111-4111-8111-111111111111",
        email="allan@example.com",
        nome="Allan",
        familia_id="22222222-2222-4222-8222-222222222222",
        familia_nome="Família Siqueira",
        papel="administrador",
        access_token="fresh-token",
    )


def test_excluir_conta_exige_login() -> None:
    response = client.post(
        "/api/v1/conta/excluir",
        json={"email_confirmacao": "allan@example.com"},
    )
    assert response.status_code == 401


def test_excluir_conta(monkeypatch) -> None:
    captured = {}

    def fake_delete(user_id, email, token):
        captured.update(user_id=user_id, email=email, token=token)
        return {
            "mensagem": "Sua conta foi excluída com sucesso.",
            "familias_excluidas": 1,
        }

    monkeypatch.setattr(endpoint, "excluir_minha_conta", fake_delete)
    app.dependency_overrides[get_current_user] = _user
    try:
        response = client.post(
            "/api/v1/conta/excluir",
            json={"email_confirmacao": "allan@example.com"},
        )
        assert response.status_code == 200
        assert response.json()["familias_excluidas"] == 1
        assert captured["token"] == "fresh-token"
    finally:
        app.dependency_overrides.clear()


def test_excluir_familia(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "excluir_familia_atual",
        lambda name, token: {
            "mensagem": "Família excluída com sucesso.",
            "familia_excluida_id": "22222222-2222-4222-8222-222222222222",
            "proxima_familia_id": "33333333-3333-4333-8333-333333333333",
            "proxima_familia_nome": "Família Compartilhada",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post(
            "/api/v1/conta/familia/excluir",
            json={"nome_confirmacao": "Família Siqueira"},
        )
        assert response.status_code == 200
        assert response.json()["proxima_familia_nome"] == "Família Compartilhada"
    finally:
        app.dependency_overrides.clear()
