from app.core.config import settings
from app.repositories import beta as repository


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")


def test_repository_obtem_onboarding(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json)
        return FakeResponse(
            200,
            {
                "mostrar": False,
                "concluido_em": "2026-07-18T12:00:00Z",
                "papel": "administrador",
                "compras_count": 3,
                "produtos_count": 10,
                "produtos_revisar_count": 0,
                "membros_count": 2,
                "primeira_compra_concluida": True,
                "revisao_produtos_concluida": True,
                "membro_adicional_concluido": True,
                "etapas_principais_concluidas": True,
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.obter_onboarding_beta("token-123")

    assert result["compras_count"] == 3
    assert captured["url"].endswith("/rpc/obter_onboarding_beta")
    assert captured["headers"]["Authorization"] == "Bearer token-123"
