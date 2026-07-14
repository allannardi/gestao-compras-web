from app.core.config import settings
from app.repositories import compras as repository
from app.repositories.compras import SupabasePurchaseError
from app.schemas.compras import CompraNfceCreate


def _purchase() -> CompraNfceCreate:
    return CompraNfceCreate(
        qr_texto="https://consulta.exemplo.gov.br/qrcode?p=123",
        chave_nfce="35260712345678000123650010000012341000012345",
        mercado_nome="Mercado Teste",
        cnpj="12.345.678/0001-23",
        data_compra="2026-07-12",
        valor_total=10.5,
        forma_pagamento="PIX",
        valor_pago=10.5,
        itens=[
            {
                "descricao_original": "Produto Teste",
                "quantidade": 1,
                "unidade": "UN",
                "valor_unitario": 10.5,
                "valor_total": 10.5,
            }
        ],
    )


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def test_repository_envia_token_e_payload(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(
            url=url,
            headers=headers,
            json=json,
            timeout=timeout,
        )
        return FakeResponse(
            200,
            {
                "compra_id": "purchase-123",
                "familia_id": "family-123",
                "supermercado_id": "market-123",
                "itens_salvos": 1,
                "produtos_criados": 1,
                "produtos_reutilizados": 0,
                "mensagem": "Compra registrada com sucesso.",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")

    result = repository.registrar_compra_nfce(_purchase(), "token-123")

    assert result["compra_id"] == "purchase-123"
    assert captured["headers"]["Authorization"] == "Bearer token-123"
    assert captured["json"]["p_payload"]["mercado_nome"] == "Mercado Teste"


def test_repository_mapeia_duplicidade(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            400,
            {"message": "Esta NFC-e já foi registrada nesta família."},
        ),
    )
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")

    try:
        repository.registrar_compra_nfce(_purchase(), "token-123")
    except SupabasePurchaseError as exc:
        assert exc.status_code == 409
    else:
        raise AssertionError("Era esperado conflito de duplicidade.")
