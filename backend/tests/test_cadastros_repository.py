from app.core.config import settings
from app.repositories import cadastros as repository


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")


def test_repository_obtem_cadastros(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
                "categorias": [],
                "supermercados": [],
                "resumo": {
                    "categorias_ativas": 12,
                    "categorias_personalizadas": 0,
                    "produtos_classificados": 0,
                    "supermercados_ativos": 0,
                    "compras_com_supermercado": 0,
                },
                "pode_editar": True,
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.obter_cadastros_familia("token-123")

    assert result["pode_editar"] is True
    assert captured["url"].endswith("/rpc/obter_cadastros_familia")
    assert captured["headers"]["Authorization"] == "Bearer token-123"


def test_repository_encaminha_atualizacao_e_mesclagem(monkeypatch) -> None:
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append((url, json))
        if url.endswith("/rpc/atualizar_categoria_cadastro"):
            return FakeResponse(
                200,
                {
                    "id": "33333333-3333-4333-8333-333333333333",
                    "nome": "Congelados",
                    "sistema": False,
                    "ativo": True,
                    "produtos_movidos": 0,
                    "mensagem": "Categoria atualizada.",
                },
            )
        return FakeResponse(
            200,
            {
                "id": "55555555-5555-4555-8555-555555555555",
                "nome": "Mercado Principal",
                "cnpj": "12345678000199",
                "compras_movidas": 2,
                "historicos_movidos": 8,
                "mensagem": "Cadastros unidos.",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    repository.atualizar_categoria_cadastro(
        "33333333-3333-4333-8333-333333333333",
        "Congelados",
        "token-123",
    )
    result = repository.mesclar_supermercados_cadastro(
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555",
        "token-123",
    )

    assert calls[0][1]["p_nome"] == "Congelados"
    assert calls[1][1]["p_supermercado_destino_id"].startswith("5555")
    assert result["compras_movidas"] == 2
