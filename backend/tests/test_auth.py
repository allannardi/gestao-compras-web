from fastapi.testclient import TestClient

from app.core.auth import FamilyContext, get_current_family_context
from app.main import app

client = TestClient(app)


def test_auth_me_requires_session() -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_auth_me_returns_family_context() -> None:
    app.dependency_overrides[get_current_family_context] = lambda: FamilyContext(
        user_id="user-123",
        email="allan@example.com",
        nome="Allan",
        familia_id="family-123",
        familia_nome="Família Nardi",
        papel="administrador",
    )
    try:
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 200
        assert response.json() == {
            "user_id": "user-123",
            "email": "allan@example.com",
            "nome": "Allan",
            "familia_id": "family-123",
            "familia_nome": "Família Nardi",
            "papel": "administrador",
        }
    finally:
        app.dependency_overrides.clear()
