from fastapi.testclient import TestClient

from app.api.v1.endpoints import compras as compras_endpoint
from app.core.auth import FamilyContext, get_current_family_context
from app.main import app
from app.repositories.compras import SupabasePurchaseError

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


def _payload() -> dict:
    return {
        "qr_texto": "https://consulta.exemplo.gov.br/qrcode?p=35260712345678000123650010000012341000012345",
        "chave_nfce": "35260712345678000123650010000012341000012345",
        "mercado_nome": "Mercado Teste",
        "cnpj": "12.345.678/0001-23",
        "data_compra": "2026-07-12",
        "valor_total": 10.5,
        "forma_pagamento": "PIX",
        "valor_pago": 10.5,
        "itens": [
            {
                "descricao_original": "Produto Teste",
                "quantidade": 1,
                "unidade": "un",
                "valor_unitario": 10.5,
                "valor_total": 10.5,
            }
        ],
    }


def test_criar_compra_exige_login() -> None:
    response = client.post("/api/v1/compras", json=_payload())
    assert response.status_code == 401


def test_criar_compra_registra_na_familia(monkeypatch) -> None:
    captured: dict = {}

    def fake_register(purchase, access_token):
        captured["purchase"] = purchase
        captured["access_token"] = access_token
        return {
            "compra_id": "purchase-123",
            "familia_id": "family-123",
            "supermercado_id": "market-123",
            "itens_salvos": 1,
            "produtos_criados": 1,
            "produtos_reutilizados": 0,
            "mensagem": "Compra registrada com sucesso.",
        }

    monkeypatch.setattr(compras_endpoint, "registrar_compra_nfce", fake_register)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post("/api/v1/compras", json=_payload())
        assert response.status_code == 201
        assert response.json()["familia_id"] == "family-123"
        assert captured["access_token"] == "token-123"
        assert captured["purchase"].chave_nfce == _payload()["chave_nfce"]
    finally:
        app.dependency_overrides.clear()


def test_criar_compra_retorna_conflito_para_nfce_duplicada(monkeypatch) -> None:
    def fake_register(_purchase, _access_token):
        raise SupabasePurchaseError(
            "Esta NFC-e já foi registrada nesta família.",
            status_code=409,
        )

    monkeypatch.setattr(compras_endpoint, "registrar_compra_nfce", fake_register)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post("/api/v1/compras", json=_payload())
        assert response.status_code == 409
        assert "já foi registrada" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_criar_compra_rejeita_sem_itens() -> None:
    payload = _payload()
    payload["itens"] = []
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.post("/api/v1/compras", json=payload)
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def _purchase_summary() -> dict:
    return {
        "id": "11111111-1111-4111-8111-111111111111",
        "supermercado_nome": "Mercado Teste",
        "data_compra": "2026-07-14",
        "valor_total": 10.5,
        "forma_pagamento": "PIX",
        "status": "confirmada",
        "itens_count": 1,
        "criado_em": "2026-07-14T10:00:00Z",
    }


def _purchase_detail() -> dict:
    return {
        "id": "11111111-1111-4111-8111-111111111111",
        "familia_id": "family-123",
        "supermercado_id": "22222222-2222-4222-8222-222222222222",
        "supermercado_nome": "Mercado Teste",
        "supermercado_cnpj": "12345678000123",
        "chave_nfce": "3" * 44,
        "data_compra": "2026-07-14",
        "valor_total": 10.5,
        "forma_pagamento": "PIX",
        "valor_pago": 10.5,
        "origem": "nfce_qrcode",
        "status": "confirmada",
        "criado_em": "2026-07-14T10:00:00Z",
        "itens": [
            {
                "id": "33333333-3333-4333-8333-333333333333",
                "produto_id": "44444444-4444-4444-8444-444444444444",
                "produto_nome": "Produto Teste",
                "descricao_original": "Produto Teste",
                "quantidade": 1,
                "unidade": "un",
                "valor_unitario": 10.5,
                "valor_total": 10.5,
                "categoria_nome": "Não classificado",
            }
        ],
    }


def test_listar_compras_exige_login() -> None:
    response = client.get("/api/v1/compras")
    assert response.status_code == 401


def test_listar_compras_retorna_apenas_contexto_autenticado(monkeypatch) -> None:
    captured = {}

    def fake_list(access_token, limite, offset):
        captured.update(access_token=access_token, limite=limite, offset=offset)
        return {
            "compras": [_purchase_summary()],
            "limite": limite,
            "offset": offset,
            "proximo_offset": None,
            "tem_mais": False,
        }

    monkeypatch.setattr(compras_endpoint, "listar_compras_familia", fake_list)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get("/api/v1/compras?limite=20&offset=0")
        assert response.status_code == 200
        assert response.json()["compras"][0]["supermercado_nome"] == "Mercado Teste"
        assert captured["access_token"] == "token-123"
        assert captured["limite"] == 20
    finally:
        app.dependency_overrides.clear()


def test_detalhar_compra_retorna_itens(monkeypatch) -> None:
    captured = {}

    def fake_detail(compra_id, access_token):
        captured.update(compra_id=compra_id, access_token=access_token)
        return _purchase_detail()

    monkeypatch.setattr(compras_endpoint, "detalhar_compra_familia", fake_detail)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get(
            "/api/v1/compras/11111111-1111-4111-8111-111111111111"
        )
        assert response.status_code == 200
        assert response.json()["itens"][0]["categoria_nome"] == "Não classificado"
        assert captured["access_token"] == "token-123"
    finally:
        app.dependency_overrides.clear()


def test_detalhar_compra_de_outra_familia_retorna_404(monkeypatch) -> None:
    def fake_detail(_compra_id, _access_token):
        raise SupabasePurchaseError(
            "Compra não encontrada nesta família.",
            status_code=404,
        )

    monkeypatch.setattr(compras_endpoint, "detalhar_compra_familia", fake_detail)
    app.dependency_overrides[get_current_family_context] = _context
    try:
        response = client.get(
            "/api/v1/compras/11111111-1111-4111-8111-111111111111"
        )
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
