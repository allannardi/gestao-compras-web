from app.core.config import settings
from app.repositories import exportacoes as repository


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")


def test_repository_obtem_resumo(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json, timeout=timeout)
        return FakeResponse(
            200,
            {
                "familia_id": "22222222-2222-4222-8222-222222222222",
                "familia_nome": "Família Nardi",
                "plano": "free",
                "gerado_em": "2026-07-18T10:00:00+00:00",
                "primeira_compra": "2026-07-01",
                "ultima_compra": "2026-07-17",
                "valor_total": 500.0,
                "compras_count": 3,
                "itens_count": 12,
                "produtos_count": 8,
                "historicos_count": 10,
                "supermercados_count": 2,
                "categorias_count": 12,
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.obter_resumo_exportacao_familia("token-123")

    assert result["compras_count"] == 3
    assert captured["url"].endswith("/rpc/obter_resumo_exportacao_familia")
    assert captured["headers"]["Authorization"] == "Bearer token-123"
    assert captured["timeout"] >= 60


def test_repository_valida_backup(monkeypatch) -> None:
    payload = {
        "familia": {"id": "family", "nome": "Família Nardi"},
        "configuracoes": {},
        "membros": [],
        "categorias": [],
        "supermercados": [],
        "produtos": [],
        "compras": [],
        "itens_compra": [],
        "historico_precos": [],
    }

    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(200, payload),
    )
    _configure(monkeypatch)

    result = repository.obter_backup_exportacao_familia("token-123")
    assert result["familia"]["nome"] == "Família Nardi"


def test_repository_mapeia_permissao(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            403,
            {"message": "Somente administradores podem exportar todos os dados da família."},
        ),
    )
    _configure(monkeypatch)

    try:
        repository.obter_resumo_exportacao_familia("token-123")
        raise AssertionError("Era esperado erro de permissão")
    except repository.SupabaseExportacaoError as exc:
        assert exc.status_code == 403
        assert "administradores" in exc.message
