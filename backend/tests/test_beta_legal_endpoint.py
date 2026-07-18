from fastapi.testclient import TestClient

from app.api.v1.endpoints import beta as endpoint
from app.core.auth import AuthenticatedUser, get_current_user
from app.main import app

client = TestClient(app)


def _user() -> AuthenticatedUser:
    return AuthenticatedUser(
        id="11111111-1111-4111-8111-111111111111",
        email="allan@example.com",
        access_token="token-123",
    )


def test_status_aceite_legal_exige_login() -> None:
    response = client.get("/api/v1/beta/aceite-legal")
    assert response.status_code == 401


def test_status_aceite_legal(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "obter_status_aceite_legal",
        lambda token: {
            "aceito": False,
            "termos_versao_atual": "1.0",
            "privacidade_versao_atual": "1.0",
            "termos_versao_aceita": None,
            "privacidade_versao_aceita": None,
            "aceito_em": None,
        },
    )
    app.dependency_overrides[get_current_user] = _user
    try:
        response = client.get("/api/v1/beta/aceite-legal")
        assert response.status_code == 200
        assert response.json()["aceito"] is False
    finally:
        app.dependency_overrides.clear()


def test_registra_aceite_legal(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "registrar_aceite_legal",
        lambda token, termos, privacidade: {
            "mensagem": "Termos e aviso de privacidade aceitos.",
            "termos_versao": termos,
            "privacidade_versao": privacidade,
            "aceito_em": "2026-07-18T12:00:00Z",
        },
    )
    app.dependency_overrides[get_current_user] = _user
    try:
        response = client.post(
            "/api/v1/beta/aceite-legal",
            json={"termos_versao": "1.0", "privacidade_versao": "1.0"},
        )
        assert response.status_code == 200
        assert response.json()["termos_versao"] == "1.0"
    finally:
        app.dependency_overrides.clear()


def test_telemetria_rejeita_evento_livre() -> None:
    app.dependency_overrides[get_current_user] = _user
    try:
        response = client.post(
            "/api/v1/beta/telemetria",
            json={
                "evento": "conteudo_compra",
                "pagina": "/",
                "app_version": "1.0.0",
                "codigo": "TESTE",
            },
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()
