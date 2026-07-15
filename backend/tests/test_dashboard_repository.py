from app.core.config import settings
from app.repositories import dashboard as repository
from app.repositories.dashboard import SupabaseDashboardError


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")


def test_repository_obtem_dashboard(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
                "mes": "2026-07-01",
                "resumo": {
                    "valor_total": 350.5,
                    "compras_count": 2,
                    "itens_count": 8,
                    "ticket_medio": 175.25,
                    "valor_mes_anterior": 300,
                    "variacao_percentual": 16.83,
                },
                "top_produtos": [],
                "top_categorias": [],
                "top_supermercados": [],
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.obter_dashboard_familia(
        "token-123",
        mes=__import__("datetime").date(2026, 7, 1),
    )

    assert result["resumo"]["valor_total"] == 350.5
    assert captured["json"] == {"p_mes": "2026-07-01"}
    assert captured["headers"]["Authorization"] == "Bearer token-123"
    assert captured["url"].endswith("/rpc/obter_dashboard_familia")


def test_repository_lista_supermercados(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            200,
            [
                {
                    "id": "33333333-3333-4333-8333-333333333333",
                    "nome": "Mercado Teste",
                    "cnpj": "",
                    "compras_count": 2,
                    "valor_total": 350.5,
                }
            ],
        ),
    )
    _configure(monkeypatch)

    result = repository.listar_supermercados_familia("token-123")
    assert result[0]["nome"] == "Mercado Teste"


def test_repository_busca_produtos_historico(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, json=json)
        return FakeResponse(
            200,
            [
                {
                    "id": "11111111-1111-4111-8111-111111111111",
                    "nome": "Arroz",
                    "marca": "",
                    "unidade_padrao": "un",
                    "categoria_nome": "Alimentos básicos",
                    "registros_count": 2,
                    "ultima_compra": "2026-07-14",
                    "ultimo_valor_unitario": 25.9,
                }
            ],
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.buscar_produtos_historico_familia(
        "token-123",
        busca="arroz",
        limite=20,
    )

    assert result[0]["registros_count"] == 2
    assert captured["json"] == {"p_busca": "arroz", "p_limite": 20}


def test_repository_obtem_historico_produto(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, json=json)
        return FakeResponse(
            200,
            {
                "produto": {
                    "id": "11111111-1111-4111-8111-111111111111",
                    "nome": "Arroz",
                    "marca": "",
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
                "pontos": [],
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.obter_historico_produto_familia(
        "11111111-1111-4111-8111-111111111111",
        "token-123",
        limite=30,
    )

    assert result["produto"]["nome"] == "Arroz"
    assert captured["json"]["p_limite"] == 30


def test_repository_mapeia_produto_de_outra_familia(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            400,
            {"message": "Produto não encontrado nesta família."},
        ),
    )
    _configure(monkeypatch)

    try:
        repository.obter_historico_produto_familia(
            "11111111-1111-4111-8111-111111111111",
            "token-123",
        )
    except SupabaseDashboardError as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("Era esperado erro de isolamento por família.")
