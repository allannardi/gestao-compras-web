from app.core.config import settings
from app.repositories import convites as repository


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")


def test_consulta_publica_nao_envia_bearer(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json)
        return FakeResponse(
            200,
            {
                "id": "33333333-3333-4333-8333-333333333333",
                "familia_id": "22222222-2222-4222-8222-222222222222",
                "familia_nome": "Família Siqueira",
                "email": "vanessa@example.com",
                "papel": "membro",
                "expira_em": "2026-07-23T10:00:00Z",
                "convidado_por_nome": "Allan",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.consultar_convite_publico("a" * 64)

    assert result["familia_nome"] == "Família Siqueira"
    assert "Authorization" not in captured["headers"]
    assert captured["json"] == {"p_token": "a" * 64}


def test_aceite_por_token_envia_sessao(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(headers=headers, json=json)
        return FakeResponse(
            200,
            {
                "familia_id": "22222222-2222-4222-8222-222222222222",
                "mensagem": "Convite aceito.",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.aceitar_convite_por_token("a" * 64, "token-123")

    assert result["familia_id"].startswith("2222")
    assert captured["headers"]["Authorization"] == "Bearer token-123"
