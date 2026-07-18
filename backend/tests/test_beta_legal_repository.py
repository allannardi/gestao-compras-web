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


def test_repository_registra_aceite_com_versoes(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, json=json)
        return FakeResponse(
            200,
            {
                "mensagem": "Termos e aviso de privacidade aceitos.",
                "termos_versao": "1.0",
                "privacidade_versao": "1.0",
                "aceito_em": "2026-07-18T12:00:00Z",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.registrar_aceite_legal("token", "1.0", "1.0")

    assert result["termos_versao"] == "1.0"
    assert captured["url"].endswith("/rpc/registrar_aceite_legal")
    assert captured["json"] == {
        "p_termos_versao": "1.0",
        "p_privacidade_versao": "1.0",
    }
