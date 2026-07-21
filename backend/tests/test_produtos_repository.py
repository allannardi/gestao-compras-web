from app.core.config import settings
from app.repositories import produtos as repository
from app.repositories.produtos import SupabaseProductError
from app.schemas.produtos import ProdutoUpdate


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")


def test_repository_lista_produtos_com_filtros(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
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
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.listar_produtos_familia(
        "token-123",
        limite=20,
        offset=0,
        busca="arroz",
        somente_revisar=True,
        categoria_id="22222222-2222-4222-8222-222222222222",
    )

    assert result["total"] == 3
    assert result["produtos"][0]["nome"] == "Arroz"
    assert captured["json"]["p_somente_revisar"] is True
    assert captured["json"]["p_busca"] == "arroz"
    assert captured["url"].endswith("/rpc/listar_produtos_familia")


def test_repository_atualiza_produto(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
                "id": "11111111-1111-4111-8111-111111111111",
                "nome": "Arroz Tipo 1",
                "marca": "Marca A",
                "unidade_padrao": "un",
                "revisar": False,
                "categoria_id": "22222222-2222-4222-8222-222222222222",
                "categoria_nome": "Alimentos básicos",
                "mensagem": "Produto atualizado com sucesso.",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    product = ProdutoUpdate(
        nome="Arroz Tipo 1",
        marca="Marca A",
        unidade_padrao="UN",
        categoria_id="22222222-2222-4222-8222-222222222222",
    )
    result = repository.atualizar_produto_familia(
        "11111111-1111-4111-8111-111111111111",
        product,
        "token-123",
    )

    assert result["revisar"] is False
    assert captured["json"]["p_payload"]["unidade_padrao"] == "un"
    assert captured["headers"]["Authorization"] == "Bearer token-123"


def test_repository_mapeia_produto_nao_encontrado(monkeypatch) -> None:
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
        repository.atualizar_produto_familia(
            "11111111-1111-4111-8111-111111111111",
            ProdutoUpdate(
                nome="Produto",
                marca="",
                unidade_padrao="un",
                categoria_id="22222222-2222-4222-8222-222222222222",
            ),
            "token-123",
        )
    except SupabaseProductError as exc:
        assert exc.status_code == 404
    else:
        raise AssertionError("Era esperado erro de produto não encontrado.")


def test_repository_cria_categoria_e_reclassifica(monkeypatch) -> None:
    responses = iter(
        [
            FakeResponse(
                200,
                {
                    "id": "33333333-3333-4333-8333-333333333333",
                    "nome": "Congelados",
                    "mensagem": "Categoria disponível para uso.",
                },
            ),
            FakeResponse(
                200,
                {
                    "classificados": 4,
                    "pendentes": 2,
                    "mensagem": "Reclassificação concluída.",
                },
            ),
        ]
    )

    monkeypatch.setattr(repository.requests, "post", lambda *args, **kwargs: next(responses))
    _configure(monkeypatch)

    category = repository.criar_categoria_familia("Congelados", "token-123")
    result = repository.reclassificar_produtos_familia("token-123")

    assert category["nome"] == "Congelados"
    assert result["classificados"] == 4


def test_repository_lista_candidatos_mesclagem(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
                "produto_principal": {
                    "id": "11111111-1111-4111-8111-111111111111",
                    "nome": "Leite Integral 1L",
                    "marca": "Marca A",
                    "unidade_padrao": "un",
                    "categoria_nome": "Frios e laticínios",
                    "compras_count": 4,
                    "registros_precos_count": 4,
                    "quantidade_total": 4,
                    "ultima_compra": "2026-07-18",
                    "aliases_count": 2,
                },
                "candidatos": [],
                "limite": 50,
                "busca": "leite",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.listar_candidatos_mesclagem_produto(
        "11111111-1111-4111-8111-111111111111",
        "token-123",
        busca="leite",
        limite=50,
    )

    assert result["produto_principal"]["nome"] == "Leite Integral 1L"
    assert captured["json"]["p_busca"] == "leite"
    assert captured["url"].endswith("/rpc/listar_candidatos_mesclagem_produto")


def test_repository_mescla_produtos(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
                "mesclagem_id": "44444444-4444-4444-8444-444444444444",
                "produto_principal_id": "11111111-1111-4111-8111-111111111111",
                "produto_incorporado_id": "33333333-3333-4333-8333-333333333333",
                "produto_principal_nome": "Leite Integral 1L",
                "produto_incorporado_nome": "LT INT MARCA A",
                "itens_transferidos": 2,
                "historicos_transferidos": 2,
                "aliases_ativos": 4,
                "mensagem": "Produtos mesclados com sucesso.",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.mesclar_produtos_familia(
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
        "token-123",
    )

    assert result["aliases_ativos"] == 4
    assert captured["json"]["p_produto_incorporado_id"].startswith("3333")
    assert captured["url"].endswith("/rpc/mesclar_produtos_familia")


def test_repository_mapeia_permissao_de_mesclagem(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            403,
            {"message": "Apenas administradores podem mesclar produtos."},
        ),
    )
    _configure(monkeypatch)

    try:
        repository.listar_candidatos_mesclagem_produto(
            "11111111-1111-4111-8111-111111111111",
            "token-123",
        )
    except SupabaseProductError as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("Era esperado erro de permissão para mesclagem.")
