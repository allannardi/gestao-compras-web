from fastapi.testclient import TestClient

from app.api.v1.endpoints import configuracoes as endpoint
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


def _settings_payload() -> dict:
    return {
        "perfil": {
            "id": "11111111-1111-4111-8111-111111111111",
            "nome": "Allan",
            "email": "allan@example.com",
        },
        "familia": {
            "id": "22222222-2222-4222-8222-222222222222",
            "nome": "Família Siqueira",
            "plano": "free",
            "status": "ativa",
            "papel": "administrador",
            "membros_count": 1,
            "limite_usuarios": 2,
        },
        "familias_disponiveis": [],
        "membros": [],
        "convites_enviados": [],
        "convites_recebidos": [],
    }


def test_configuracoes_exigem_login() -> None:
    response = client.get("/api/v1/configuracoes")
    assert response.status_code == 401


def test_obter_configuracoes(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "obter_configuracoes_familia",
        lambda _token: _settings_payload(),
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/configuracoes")
        assert response.status_code == 200
        assert response.json()["familia"]["membros_count"] == 1
    finally:
        app.dependency_overrides.clear()


def test_atualizar_perfil(monkeypatch) -> None:
    captured = {}

    def fake_update(nome, access_token):
        captured.update(nome=nome, access_token=access_token)
        return {"mensagem": "Seu nome foi atualizado."}

    monkeypatch.setattr(endpoint, "atualizar_meu_perfil", fake_update)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.patch(
            "/api/v1/configuracoes/perfil",
            json={"nome": "Allan Nardi"},
        )
        assert response.status_code == 200
        assert captured["access_token"] == "token-123"
    finally:
        app.dependency_overrides.clear()


def test_criar_e_aceitar_convite(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "criar_convite_familia",
        lambda email, papel, token: {
            "id": "33333333-3333-4333-8333-333333333333",
            "email": email,
            "papel": papel,
            "status": "pendente",
            "token": "a" * 64,
            "expira_em": "2026-07-23T10:00:00Z",
            "mensagem": "Convite criado.",
        },
    )
    monkeypatch.setattr(
        endpoint,
        "aceitar_convite_familia",
        lambda convite_id, token: {
            "familia_id": "22222222-2222-4222-8222-222222222222",
            "mensagem": "Convite aceito.",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        created = client.post(
            "/api/v1/configuracoes/convites",
            json={"email": "vanessa@example.com", "papel": "membro"},
        )
        accepted = client.post(
            "/api/v1/configuracoes/convites/33333333-3333-4333-8333-333333333333/aceitar"
        )
        assert created.status_code == 200
        assert created.json()["status"] == "pendente"
        assert accepted.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_selecionar_familia(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "selecionar_familia_atual",
        lambda familia_id, token: {
            "familia_id": familia_id,
            "familia_nome": "Família Compartilhada",
            "mensagem": "Família atualizada.",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post(
            "/api/v1/configuracoes/familias/44444444-4444-4444-8444-444444444444/selecionar"
        )
        assert response.status_code == 200
        assert response.json()["familia_nome"] == "Família Compartilhada"
    finally:
        app.dependency_overrides.clear()


def test_regenerar_link_convite(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "gerar_link_convite_familia",
        lambda convite_id, token: {
            "id": convite_id,
            "email": "vanessa@example.com",
            "papel": "membro",
            "status": "pendente",
            "token": "b" * 64,
            "expira_em": "2026-07-23T10:00:00Z",
            "mensagem": "Novo link de convite gerado.",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post(
            "/api/v1/configuracoes/convites/33333333-3333-4333-8333-333333333333/link"
        )
        assert response.status_code == 200
        assert response.json()["token"] == "b" * 64
    finally:
        app.dependency_overrides.clear()


def test_administrador_solicita_redefinicao_de_senha(monkeypatch) -> None:
    captured = {}

    def fake_reset(usuario_id, access_token):
        captured.update(usuario_id=usuario_id, access_token=access_token)
        return {"mensagem": "E-mail de redefinição enviado."}

    monkeypatch.setattr(
        endpoint,
        "solicitar_redefinicao_senha_membro",
        fake_reset,
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post(
            "/api/v1/configuracoes/membros/55555555-5555-4555-8555-555555555555/redefinir-senha"
        )
        assert response.status_code == 200
        assert captured == {
            "usuario_id": "55555555-5555-4555-8555-555555555555",
            "access_token": "token-123",
        }
    finally:
        app.dependency_overrides.clear()
