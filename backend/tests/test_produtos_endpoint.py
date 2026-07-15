from fastapi.testclient import TestClient

from app.api.v1.endpoints import produtos as produtos_endpoint
from app.core.auth import FamilyContext, get_current_family_context
from app.main import app

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


def _product_list() -> dict:
    return {
        "produtos": [
            {
                "id": "11111111-1111-4111-8111-111111111111",
                "nome": "Arroz",
                "marca": "Marca A",
                "unidade_padrao": "un",
                "revisar": False,
                "categoria_id": "22222222-2222-4222-8222-222222222222",
                "categoria_nome": "Alimentos básicos",
                "compras_count": 2,
                "ultima_compra": "2026-07-14",
                "ultimo_valor_unitario": 25.9,
                "atualizado_em": "2026-07-14T10:00:00Z",
            }
        ],
        "total": 3,
        "para_revisar": 1,
        "classificados": 2,
        "filtrados": 1,
        "limite": 20,
        "offset": 0,
        "proximo_offset": None,
        "tem_mais": False,
    }


def test_listar_produtos_exige_login() -> None:
    response = client.get("/api/v1/produtos")
    assert response.status_code == 401


def test_listar_produtos_encaminha_filtros(monkeypatch) -> None:
    captured = {}

    def fake_list(access_token, limite, offset, busca, somente_revisar, categoria_id):
        captured.update(
            access_token=access_token,
            limite=limite,
            offset=offset,
            busca=busca,
            somente_revisar=somente_revisar,
            categoria_id=categoria_id,
        )
        return _product_list()

    monkeypatch.setattr(produtos_endpoint, "listar_produtos_familia", fake_list)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get(
            "/api/v1/produtos?busca=arroz&somente_revisar=true&categoria_id=22222222-2222-4222-8222-222222222222"
        )
        assert response.status_code == 200
        assert response.json()["produtos"][0]["nome"] == "Arroz"
        assert captured["somente_revisar"] is True
        assert captured["access_token"] == "token-123"
    finally:
        app.dependency_overrides.clear()


def test_atualizar_produto(monkeypatch) -> None:
    captured = {}

    def fake_update(produto_id, payload, access_token):
        captured.update(
            produto_id=produto_id,
            payload=payload,
            access_token=access_token,
        )
        return {
            "id": produto_id,
            "nome": payload.nome,
            "marca": payload.marca,
            "unidade_padrao": payload.unidade_padrao,
            "revisar": False,
            "categoria_id": payload.categoria_id,
            "categoria_nome": "Alimentos básicos",
            "mensagem": "Produto atualizado com sucesso.",
        }

    monkeypatch.setattr(produtos_endpoint, "atualizar_produto_familia", fake_update)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.patch(
            "/api/v1/produtos/11111111-1111-4111-8111-111111111111",
            json={
                "nome": "Arroz Tipo 1",
                "marca": "Marca A",
                "unidade_padrao": "un",
                "categoria_id": "22222222-2222-4222-8222-222222222222",
            },
        )
        assert response.status_code == 200
        assert response.json()["revisar"] is False
        assert captured["access_token"] == "token-123"
    finally:
        app.dependency_overrides.clear()


def test_categorias_e_reclassificacao(monkeypatch) -> None:
    monkeypatch.setattr(
        produtos_endpoint,
        "listar_categorias_familia",
        lambda _token: [
            {
                "id": "22222222-2222-4222-8222-222222222222",
                "nome": "Alimentos básicos",
                "sistema": True,
                "ativo": True,
                "produtos_count": 2,
            }
        ],
    )
    monkeypatch.setattr(
        produtos_endpoint,
        "reclassificar_produtos_familia",
        lambda _token: {
            "classificados": 2,
            "pendentes": 1,
            "mensagem": "Reclassificação concluída.",
        },
    )
    app.dependency_overrides[get_current_family_context] = _context
    try:
        categories = client.get("/api/v1/categorias")
        reclassification = client.post("/api/v1/produtos/reclassificar")
        assert categories.status_code == 200
        assert categories.json()[0]["produtos_count"] == 2
        assert reclassification.status_code == 200
        assert reclassification.json()["classificados"] == 2
    finally:
        app.dependency_overrides.clear()
