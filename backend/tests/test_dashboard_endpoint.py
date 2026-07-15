from fastapi.testclient import TestClient

from app.api.v1.endpoints import dashboard as dashboard_endpoint
from app.core.auth import FamilyContext, get_current_family_context
from app.main import app
from app.repositories.dashboard import SupabaseDashboardError

client = TestClient(app)


def _context() -> FamilyContext:
    return FamilyContext(
        user_id="user-123",
        email="allan@example.com",
        nome="Allan",
        familia_id="family-123",
        familia_nome="Família Nardi",
        papel="administrador",
        access_token="token-123",
    )


def _dashboard_payload() -> dict:
    return {
        "mes": "2026-07-01",
        "resumo": {
            "valor_total": 350.5,
            "compras_count": 2,
            "itens_count": 8,
            "ticket_medio": 175.25,
            "valor_mes_anterior": 300,
            "variacao_percentual": 16.83,
        },
        "top_produtos": [
            {
                "id": "11111111-1111-4111-8111-111111111111",
                "nome": "Arroz",
                "marca": "Marca A",
                "unidade_padrao": "un",
                "quantidade": 2,
                "valor_total": 50,
                "compras_count": 2,
            }
        ],
        "top_categorias": [
            {
                "id": "22222222-2222-4222-8222-222222222222",
                "nome": "Alimentos básicos",
                "valor_total": 120,
                "compras_count": 2,
                "produtos_count": 4,
            }
        ],
        "top_supermercados": [
            {
                "id": "33333333-3333-4333-8333-333333333333",
                "nome": "Mercado Teste",
                "valor_total": 350.5,
                "compras_count": 2,
            }
        ],
    }


def test_dashboard_exige_login() -> None:
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 401


def test_dashboard_encaminha_mes(monkeypatch) -> None:
    captured = {}

    def fake_dashboard(access_token, mes):
        captured.update(access_token=access_token, mes=mes)
        return _dashboard_payload()

    monkeypatch.setattr(dashboard_endpoint, "obter_dashboard_familia", fake_dashboard)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/dashboard?mes=2026-07-01")
        assert response.status_code == 200
        assert response.json()["resumo"]["compras_count"] == 2
        assert captured["access_token"] == "token-123"
        assert captured["mes"].isoformat() == "2026-07-01"
    finally:
        app.dependency_overrides.clear()


def test_listar_supermercados(monkeypatch) -> None:
    monkeypatch.setattr(
        dashboard_endpoint,
        "listar_supermercados_familia",
        lambda _token: [
            {
                "id": "33333333-3333-4333-8333-333333333333",
                "nome": "Mercado Teste",
                "cnpj": "12345678000190",
                "compras_count": 2,
                "valor_total": 350.5,
            }
        ],
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/supermercados")
        assert response.status_code == 200
        assert response.json()[0]["nome"] == "Mercado Teste"
    finally:
        app.dependency_overrides.clear()


def test_buscar_produtos_com_historico(monkeypatch) -> None:
    captured = {}

    def fake_search(access_token, busca, limite):
        captured.update(access_token=access_token, busca=busca, limite=limite)
        return [
            {
                "id": "11111111-1111-4111-8111-111111111111",
                "nome": "Arroz",
                "marca": "Marca A",
                "unidade_padrao": "un",
                "categoria_nome": "Alimentos básicos",
                "registros_count": 2,
                "ultima_compra": "2026-07-14",
                "ultimo_valor_unitario": 25.9,
            }
        ]

    monkeypatch.setattr(
        dashboard_endpoint,
        "buscar_produtos_historico_familia",
        fake_search,
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/historico-precos/produtos?busca=arroz")
        assert response.status_code == 200
        assert response.json()[0]["registros_count"] == 2
        assert captured["busca"] == "arroz"
    finally:
        app.dependency_overrides.clear()


def test_obter_historico_produto(monkeypatch) -> None:
    captured = {}

    def fake_history(produto_id, access_token, limite):
        captured.update(
            produto_id=produto_id,
            access_token=access_token,
            limite=limite,
        )
        return {
            "produto": {
                "id": produto_id,
                "nome": "Arroz",
                "marca": "Marca A",
                "unidade_padrao": "un",
                "categoria_nome": "Alimentos básicos",
            },
            "resumo": {
                "registros_count": 2,
                "menor_valor": 20,
                "maior_valor": 25.9,
                "primeiro_valor": 20,
                "ultimo_valor": 25.9,
                "variacao_percentual": 29.5,
            },
            "pontos": [
                {
                    "id": "44444444-4444-4444-8444-444444444444",
                    "compra_id": "55555555-5555-4555-8555-555555555555",
                    "data_compra": "2026-07-14",
                    "valor_unitario": 25.9,
                    "quantidade": 1,
                    "unidade": "un",
                    "supermercado_nome": "Mercado Teste",
                }
            ],
        }

    monkeypatch.setattr(
        dashboard_endpoint,
        "obter_historico_produto_familia",
        fake_history,
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get(
            "/api/v1/historico-precos/produtos/11111111-1111-4111-8111-111111111111"
        )
        assert response.status_code == 200
        assert response.json()["resumo"]["ultimo_valor"] == 25.9
        assert captured["access_token"] == "token-123"
    finally:
        app.dependency_overrides.clear()


def test_historico_de_outra_familia_retorna_404(monkeypatch) -> None:
    def fake_history(_produto_id, _access_token, _limite):
        raise SupabaseDashboardError(
            "Produto não encontrado nesta família.",
            status_code=404,
        )

    monkeypatch.setattr(
        dashboard_endpoint,
        "obter_historico_produto_familia",
        fake_history,
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get(
            "/api/v1/historico-precos/produtos/11111111-1111-4111-8111-111111111111"
        )
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
