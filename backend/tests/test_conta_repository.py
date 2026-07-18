from app.core.config import settings
from app.repositories import conta as repository
from app.repositories.conta import SupabaseContaError


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")
    monkeypatch.setattr(settings, "supabase_secret_key", "secret-key")


def test_repository_exclui_conta(monkeypatch) -> None:
    calls = []

    def fake_post(url, headers, json, timeout):
        calls.append(("post", url, headers, json))
        return FakeResponse(
            200,
            {
                "pode_excluir": True,
                "usuario_id": "user-123",
                "email": "allan@example.com",
                "familias_count": 2,
                "familias_exclusivas_count": 1,
            },
        )

    def fake_delete(url, headers, params, timeout):
        calls.append(("delete", url, headers, params))
        return FakeResponse(200, {"id": "user-123"})

    monkeypatch.setattr(repository.requests, "post", fake_post)
    monkeypatch.setattr(repository.requests, "delete", fake_delete)
    _configure(monkeypatch)

    result = repository.excluir_minha_conta(
        "user-123",
        "allan@example.com",
        "fresh-token",
    )

    assert result["familias_excluidas"] == 1
    assert calls[0][1].endswith("/rpc/preparar_exclusao_minha_conta")
    assert calls[1][1].endswith("/auth/v1/admin/users/user-123")
    assert calls[1][2]["Authorization"] == "Bearer secret-key"


def test_repository_bloqueia_sem_secret_key(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            200,
            {
                "pode_excluir": True,
                "usuario_id": "user-123",
                "email": "allan@example.com",
                "familias_count": 1,
                "familias_exclusivas_count": 1,
            },
        ),
    )
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "supabase_secret_key", "")

    try:
        repository.excluir_minha_conta(
            "user-123",
            "allan@example.com",
            "fresh-token",
        )
    except SupabaseContaError as exc:
        assert exc.status_code == 503
        assert "SUPABASE_SECRET_KEY" in exc.message
    else:
        raise AssertionError("Era esperado erro de configuração administrativa.")


def test_repository_exclui_familia(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, json=json)
        return FakeResponse(
            200,
            {
                "mensagem": "Família excluída com sucesso.",
                "familia_excluida_id": "family-1",
                "proxima_familia_id": "family-2",
                "proxima_familia_nome": "Família 2",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.excluir_familia_atual("Família 1", "fresh-token")

    assert result["proxima_familia_id"] == "family-2"
    assert captured["json"] == {"p_nome_confirmacao": "Família 1"}
