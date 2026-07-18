from fastapi.testclient import TestClient

from app.api.v1.endpoints import beta as endpoint
from app.core.auth import FamilyContext, get_current_family_context
from app.main import app

client = TestClient(app)


def _context() -> FamilyContext:
    return FamilyContext(
        user_id="11111111-1111-4111-8111-111111111111",
        email="allan@example.com",
        nome="Allan",
        familia_id="22222222-2222-4222-8222-222222222222",
        familia_nome="Família Siqueira",
        papel="administrador",
        access_token="token-123",
    )


def test_onboarding_exige_login() -> None:
    response = client.get("/api/v1/beta/onboarding")
    assert response.status_code == 401


def test_obter_onboarding(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "obter_onboarding_beta",
        lambda token: {
            "mostrar": True,
            "concluido_em": None,
            "papel": "administrador",
            "compras_count": 1,
            "produtos_count": 5,
            "produtos_revisar_count": 0,
            "membros_count": 2,
            "primeira_compra_concluida": True,
            "revisao_produtos_concluida": True,
            "membro_adicional_concluido": True,
            "etapas_principais_concluidas": True,
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/beta/onboarding")
        assert response.status_code == 200
        assert response.json()["etapas_principais_concluidas"] is True
    finally:
        app.dependency_overrides.clear()


def test_concluir_onboarding(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "concluir_onboarding_beta",
        lambda token: {
            "mensagem": "Guia inicial concluído.",
            "concluido_em": "2026-07-18T12:00:00Z",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post("/api/v1/beta/onboarding/concluir")
        assert response.status_code == 200
        assert response.json()["mensagem"] == "Guia inicial concluído."
    finally:
        app.dependency_overrides.clear()
