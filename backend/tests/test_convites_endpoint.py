from fastapi.testclient import TestClient

from app.api.v1.endpoints import convites as endpoint
from app.core.auth import FamilyContext, get_current_family_context
from app.main import app

client = TestClient(app)


def _context() -> FamilyContext:
    return FamilyContext(
        user_id="11111111-1111-4111-8111-111111111111",
        email="vanessa@example.com",
        nome="Vanessa",
        familia_id="44444444-4444-4444-8444-444444444444",
        familia_nome="Família Vanessa",
        papel="administrador",
        access_token="token-123",
    )


def test_consulta_convite_e_publica(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "consultar_convite_publico",
        lambda _token: {
            "id": "33333333-3333-4333-8333-333333333333",
            "familia_id": "22222222-2222-4222-8222-222222222222",
            "familia_nome": "Família Siqueira",
            "email": "vanessa@example.com",
            "papel": "membro",
            "expira_em": "2026-07-23T10:00:00Z",
            "convidado_por_nome": "Allan",
        },
    )
    response = client.get(f"/api/v1/convites/publico/{'a' * 64}")
    assert response.status_code == 200
    assert response.json()["email"] == "vanessa@example.com"


def test_aceite_por_token_exige_login() -> None:
    response = client.post(
        "/api/v1/convites/aceitar",
        json={"token": "a" * 64},
    )
    assert response.status_code == 401


def test_aceite_por_token_autenticado(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "aceitar_convite_por_token",
        lambda _token, _access_token: {
            "familia_id": "22222222-2222-4222-8222-222222222222",
            "mensagem": "Convite aceito.",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post(
            "/api/v1/convites/aceitar",
            json={"token": "a" * 64},
        )
        assert response.status_code == 200
        assert response.json()["familia_id"].startswith("2222")
    finally:
        app.dependency_overrides.clear()
