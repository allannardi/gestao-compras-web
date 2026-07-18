from fastapi.testclient import TestClient

from app.api.v1.endpoints import cadastros as endpoint
from app.core.auth import FamilyContext, get_current_family_context
from app.main import app

client = TestClient(app)


def _context() -> FamilyContext:
    return FamilyContext(
        user_id="11111111-1111-4111-8111-111111111111",
        email="allan@example.com",
        nome="Allan",
        familia_id="22222222-2222-4222-8222-222222222222",
        familia_nome="Família Nardi",
        papel="administrador",
        access_token="token-123",
    )


def _payload() -> dict:
    return {
        "categorias": [
            {
                "id": "33333333-3333-4333-8333-333333333333",
                "nome": "Congelados",
                "sistema": False,
                "ativo": True,
                "produtos_count": 3,
            }
        ],
        "supermercados": [
            {
                "id": "44444444-4444-4444-8444-444444444444",
                "nome": "Mercado Central",
                "cnpj": "12345678000199",
                "ativo": True,
                "compras_count": 4,
                "valor_total": 580.2,
                "ultima_compra": "2026-07-17",
            }
        ],
        "resumo": {
            "categorias_ativas": 13,
            "categorias_personalizadas": 1,
            "produtos_classificados": 18,
            "supermercados_ativos": 2,
            "compras_com_supermercado": 4,
        },
        "pode_editar": True,
    }


def test_cadastros_exigem_login() -> None:
    response = client.get("/api/v1/cadastros")
    assert response.status_code == 401


def test_obter_cadastros(monkeypatch) -> None:
    monkeypatch.setattr(endpoint, "obter_cadastros_familia", lambda token: _payload())
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/cadastros")
        assert response.status_code == 200
        assert response.json()["categorias"][0]["produtos_count"] == 3
        assert response.json()["supermercados"][0]["compras_count"] == 4
    finally:
        app.dependency_overrides.clear()


def test_atualizar_e_desativar_categoria(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "atualizar_categoria_cadastro",
        lambda categoria_id, nome, token: {
            "id": categoria_id,
            "nome": nome,
            "sistema": False,
            "ativo": True,
            "produtos_movidos": 0,
            "mensagem": "Categoria atualizada.",
        },
    )
    monkeypatch.setattr(
        endpoint,
        "desativar_categoria_cadastro",
        lambda categoria_id, destino_id, token: {
            "id": categoria_id,
            "nome": "Congelados",
            "sistema": False,
            "ativo": False,
            "produtos_movidos": 3,
            "mensagem": "Categoria desativada.",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        updated = client.patch(
            "/api/v1/cadastros/categorias/33333333-3333-4333-8333-333333333333",
            json={"nome": "Congelados e sorvetes"},
        )
        deactivated = client.post(
            "/api/v1/cadastros/categorias/33333333-3333-4333-8333-333333333333/desativar",
            json={"categoria_destino_id": "55555555-5555-4555-8555-555555555555"},
        )
        assert updated.status_code == 200
        assert updated.json()["nome"] == "Congelados e sorvetes"
        assert deactivated.status_code == 200
        assert deactivated.json()["produtos_movidos"] == 3
    finally:
        app.dependency_overrides.clear()


def test_atualizar_e_mesclar_supermercado(monkeypatch) -> None:
    monkeypatch.setattr(
        endpoint,
        "atualizar_supermercado_cadastro",
        lambda supermercado_id, nome, token: {
            "id": supermercado_id,
            "nome": nome,
            "cnpj": "12345678000199",
            "compras_movidas": 0,
            "historicos_movidos": 0,
            "mensagem": "Nome atualizado.",
        },
    )
    monkeypatch.setattr(
        endpoint,
        "mesclar_supermercados_cadastro",
        lambda origem_id, destino_id, token: {
            "id": destino_id,
            "nome": "Mercado Principal",
            "cnpj": "12345678000199",
            "compras_movidas": 2,
            "historicos_movidos": 8,
            "mensagem": "Cadastros unidos.",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        updated = client.patch(
            "/api/v1/cadastros/supermercados/44444444-4444-4444-8444-444444444444",
            json={"nome": "Mercado Principal"},
        )
        merged = client.post(
            "/api/v1/cadastros/supermercados/44444444-4444-4444-8444-444444444444/mesclar",
            json={
                "supermercado_destino_id": "55555555-5555-4555-8555-555555555555",
                "confirmacao": "UNIR",
            },
        )
        assert updated.status_code == 200
        assert merged.status_code == 200
        assert merged.json()["historicos_movidos"] == 8
    finally:
        app.dependency_overrides.clear()
