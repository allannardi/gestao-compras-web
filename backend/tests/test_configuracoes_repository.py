from app.core.config import settings
from app.repositories import configuracoes as repository
from app.repositories.configuracoes import SupabaseConfiguracoesError


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _configure(monkeypatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(settings, "supabase_publishable_key", "publishable-key")


def _settings_payload() -> dict:
    return {
        "perfil": {
            "id": "11111111-1111-4111-8111-111111111111",
            "nome": "Allan",
            "email": "allan@example.com",
        },
        "familia": {
            "id": "22222222-2222-4222-8222-222222222222",
            "nome": "Família Siqueira",
            "plano": "free",
            "status": "ativa",
            "papel": "administrador",
            "membros_count": 1,
            "limite_usuarios": 2,
        },
        "familias_disponiveis": [],
        "membros": [],
        "convites_enviados": [],
        "convites_recebidos": [],
    }


def test_repository_obtem_configuracoes(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, headers=headers, json=json)
        return FakeResponse(200, _settings_payload())

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.obter_configuracoes_familia("token-123")

    assert result["familia"]["nome"] == "Família Siqueira"
    assert captured["url"].endswith("/rpc/obter_configuracoes_familia")
    assert captured["headers"]["Authorization"] == "Bearer token-123"


def test_repository_cria_convite(monkeypatch) -> None:
    captured = {}

    def fake_post(url, headers, json, timeout):
        captured.update(url=url, json=json)
        return FakeResponse(
            200,
            {
                "id": "33333333-3333-4333-8333-333333333333",
                "email": "vanessa@example.com",
                "papel": "membro",
                "status": "pendente",
                "expira_em": "2026-07-23T10:00:00Z",
                "mensagem": "Convite criado.",
            },
        )

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)

    result = repository.criar_convite_familia(
        "vanessa@example.com",
        "membro",
        "token-123",
    )

    assert result["status"] == "pendente"
    assert captured["json"] == {
        "p_email": "vanessa@example.com",
        "p_papel": "membro",
    }


def test_repository_aceita_convite(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            200,
            {
                "familia_id": "22222222-2222-4222-8222-222222222222",
                "mensagem": "Convite aceito.",
            },
        ),
    )
    _configure(monkeypatch)

    result = repository.aceitar_convite_familia(
        "33333333-3333-4333-8333-333333333333",
        "token-123",
    )
    assert result["familia_id"] == "22222222-2222-4222-8222-222222222222"


def test_repository_mapeia_permissao(monkeypatch) -> None:
    monkeypatch.setattr(
        repository.requests,
        "post",
        lambda *args, **kwargs: FakeResponse(
            400,
            {"message": "Apenas administradores podem criar convites."},
        ),
    )
    _configure(monkeypatch)

    try:
        repository.criar_convite_familia(
            "vanessa@example.com",
            "membro",
            "token-123",
        )
    except SupabaseConfiguracoesError as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("Era esperado erro de permissão.")


def test_repository_envia_redefinicao_para_membro(monkeypatch) -> None:
    calls = []

    def fake_post(url, headers, json, timeout, params=None):
        calls.append({"url": url, "json": json, "params": params, "headers": headers})
        if url.endswith("/rest/v1/rpc/obter_email_redefinicao_membro"):
            return FakeResponse(
                200,
                {
                    "usuario_id": "55555555-5555-4555-8555-555555555555",
                    "nome": "Vanessa",
                    "email": "vanessa@example.com",
                },
            )
        return FakeResponse(200, {})

    monkeypatch.setattr(repository.requests, "post", fake_post)
    _configure(monkeypatch)
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(
        settings,
        "cors_origins_raw",
        "http://localhost:3000,https://gestao-compras-web.vercel.app",
    )

    result = repository.solicitar_redefinicao_senha_membro(
        "55555555-5555-4555-8555-555555555555",
        "token-123",
    )

    assert "Vanessa" in result["mensagem"]
    assert calls[0]["json"] == {
        "p_usuario_id": "55555555-5555-4555-8555-555555555555"
    }
    assert calls[1]["url"].endswith("/auth/v1/recover")
    assert calls[1]["json"] == {"email": "vanessa@example.com"}
    assert calls[1]["params"] == {
        "redirect_to": "https://gestao-compras-web.vercel.app/redefinir-senha"
    }
