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


def test_repository_lista_compras_com_paginacao(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            [
                {
                    "id": "11111111-1111-4111-8111-111111111111",
                    "supermercado_nome": "Mercado A",
                    "data_compra": "2026-07-14",
                    "valor_total": 100,
                    "forma_pagamento": "PIX",
                    "status": "confirmada",
                    "itens_count": 3,
                    "criado_em": "2026-07-14T10:00:00Z",
                },
                {
                    "id": "22222222-2222-4222-8222-222222222222",
                    "supermercado_nome": "Mercado B",
                    "data_compra": "2026-07-13",
                    "valor_total": 50,
                    "forma_pagamento": "Cartão",
                    "status": "confirmada",
                    "itens_count": 2,
                    "criado_em": "2026-07-13T10:00:00Z",
                },
            ],
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")

    result = repository.listar_compras_familia("token-123", limite=1, offset=0)

    assert len(result["compras"]) == 1
    assert result["tem_mais"] is True
    assert result["proximo_offset"] == 1
    assert captured["json"] == {"p_limite": 2, "p_offset": 0}
    assert captured["url"].endswith("/rpc/listar_compras_familia")


def test_repository_detalha_compra(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
                "id": "11111111-1111-4111-8111-111111111111",
                "familia_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "supermercado_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                "supermercado_nome": "Mercado A",
                "supermercado_cnpj": "12345678000190",
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
                        "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                        "produto_id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
                        "produto_nome": "Produto A",
                        "descricao_original": "Produto A",
                        "quantidade": 1,
                        "unidade": "un",
                        "valor_unitario": 10.5,
                        "valor_total": 10.5,
                        "categoria_nome": "Não classificado",
                    }
                ],
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")

    result = repository.detalhar_compra_familia(
        "11111111-1111-4111-8111-111111111111",
        "token-123",
    )

    assert result["supermercado_nome"] == "Mercado A"
    assert len(result["itens"]) == 1
    assert captured["json"]["p_compra_id"] == "11111111-1111-4111-8111-111111111111"
    assert captured["url"].endswith("/rpc/detalhar_compra_familia")


def test_repository_mapeia_compra_nao_encontrada(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            400,
            {"message": "Compra não encontrada nesta família."},
        ),
    )
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")

    try:
        repository.detalhar_compra_familia(
            "11111111-1111-4111-8111-111111111111",
            "token-123",
        )
    except SupabasePurchaseError as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("Era esperado erro de compra não encontrada.")
