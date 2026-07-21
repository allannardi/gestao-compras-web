from fastapi.testclient import TestClient

from app.api.v1.endpoints import admin_geral as endpoint
from app.core.auth import SystemAdminContext, get_current_system_admin
from app.main import app

client = TestClient(app)


def _admin() -> SystemAdminContext:
    return SystemAdminContext(
        user_id="11111111-1111-4111-8111-111111111111",
        email="allan@example.com",
        nome="Allan",
        access_token="admin-token",
    )


def test_admin_geral_exige_login() -> None:
    response = client.get("/api/v1/admin-geral/resumo")
    assert response.status_code == 401


def test_admin_geral_resumo(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "obter_resumo_admin_geral",
        lambda _token: {
            "familias_total": 4,
            "familias_ativas": 3,
            "familias_suspensas": 1,
            "familias_novas_30_dias": 2,
            "usuarios_total": 7,
            "membros_ativos": 8,
            "compras_total": 25,
            "itens_total": 160,
            "produtos_total": 90,
            "supermercados_total": 12,
            "administradores_sistema": 1,
            "gerado_em": "2026-07-21T12:00:00Z",
            "administrador_id": "11111111-1111-4111-8111-111111111111",
        },
    )
    app.dependency_overrides[get_current_system_admin] = _admin
    try:
        response = client.get("/api/v1/admin-geral/resumo")
        assert response.status_code == 200
        assert response.json()["familias_suspensas"] == 1
    finally:
        app.dependency_overrides.clear()


def test_admin_geral_lista_familias(monkeypatch) -> None:
    captured = {}

    def fake_list(token, busca, situacao, limite, offset):
        captured.update(
            token=token,
            busca=busca,
            situacao=situacao,
            limite=limite,
            offset=offset,
        )
        return {
            "familias": [],
            "total": 0,
            "limite": limite,
            "offset": offset,
            "tem_mais": False,
            "administrador_id": "11111111-1111-4111-8111-111111111111",
        }

    monkeypatch.setattr(endpoint, "listar_familias_admin", fake_list)
    app.dependency_overrides[get_current_system_admin] = _admin
    try:
        response = client.get(
            "/api/v1/admin-geral/familias?busca=teste&situacao=suspensa"
        )
        assert response.status_code == 200
        assert captured["token"] == "admin-token"
        assert captured["busca"] == "teste"
        assert captured["situacao"] == "suspensa"
    finally:
        app.dependency_overrides.clear()


def test_admin_geral_suspende_familia(monkeypatch) -> None:
    captured = {}

    def fake_status(family_id, status, reason, token, ip, request_id):
        captured.update(
            family_id=family_id,
            status=status,
            reason=reason,
            token=token,
            ip=ip,
            request_id=request_id,
        )
        return {
            "mensagem": "Família suspensa com sucesso.",
            "familia_id": family_id,
            "status": status,
        }

    monkeypatch.setattr(endpoint, "alterar_status_familia_admin", fake_status)
    app.dependency_overrides[get_current_system_admin] = _admin
    try:
        response = client.post(
            "/api/v1/admin-geral/familias/22222222-2222-4222-8222-222222222222/suspender",
            json={"motivo": "Conta criada para teste"},
            headers={"x-request-id": "req-123"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "suspensa"
        assert captured["request_id"] == "req-123"
    finally:
        app.dependency_overrides.clear()


def test_admin_geral_exclui_familia_com_confirmacao(monkeypatch) -> None:
    captured = {}

    def fake_delete(
        family_id,
        name,
        confirmation,
        reason,
        token,
        ip,
        request_id,
    ):
        captured.update(
            family_id=family_id,
            name=name,
            confirmation=confirmation,
            reason=reason,
            token=token,
        )
        return {
            "mensagem": "Família excluída definitivamente.",
            "familia_id": family_id,
            "familia_nome": name,
            "usuarios_sem_familia": 1,
            "resumo_excluido": {"compras_count": 3},
        }

    monkeypatch.setattr(endpoint, "excluir_familia_admin", fake_delete)
    app.dependency_overrides[get_current_system_admin] = _admin
    try:
        response = client.request(
            "DELETE",
            "/api/v1/admin-geral/familias/22222222-2222-4222-8222-222222222222",
            json={
                "nome_confirmacao": "Família Teste",
                "confirmacao": "EXCLUIR DEFINITIVAMENTE",
                "motivo": "Limpeza de teste",
            },
        )
        assert response.status_code == 200
        assert response.json()["usuarios_sem_familia"] == 1
        assert captured["confirmation"] == "EXCLUIR DEFINITIVAMENTE"
    finally:
        app.dependency_overrides.clear()


def test_admin_geral_rejeita_confirmacao_incorreta() -> None:
    app.dependency_overrides[get_current_system_admin] = _admin
    try:
        response = client.request(
            "DELETE",
            "/api/v1/admin-geral/familias/22222222-2222-4222-8222-222222222222",
            json={
                "nome_confirmacao": "Família Teste",
                "confirmacao": "EXCLUIR",
                "motivo": "Limpeza de teste",
            },
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_admin_geral_exclui_usuario(monkeypatch) -> None:
    captured = {}

    def fake_delete(
        user_id,
        email,
        confirmation,
        reason,
        token,
        ip,
        request_id,
    ):
        captured.update(
            user_id=user_id,
            email=email,
            confirmation=confirmation,
            reason=reason,
            token=token,
        )
        return {
            "mensagem": "Usuário excluído definitivamente.",
            "usuario_id": user_id,
        }

    monkeypatch.setattr(endpoint, "excluir_usuario_admin", fake_delete)
    app.dependency_overrides[get_current_system_admin] = _admin
    try:
        response = client.request(
            "DELETE",
            "/api/v1/admin-geral/usuarios/33333333-3333-4333-8333-333333333333",
            json={
                "email_confirmacao": "teste@example.com",
                "confirmacao": "EXCLUIR DEFINITIVAMENTE",
                "motivo": "Usuário criado para teste",
            },
        )
        assert response.status_code == 200
        assert captured["email"] == "teste@example.com"
    finally:
        app.dependency_overrides.clear()
