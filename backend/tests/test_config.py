from app.core.config import Settings


def test_cors_origins_are_normalized() -> None:
    settings = Settings(
        CORS_ORIGINS="https://app.example.com/, http://localhost:3000",
        CORS_ORIGIN_REGEX="",
    )

    assert settings.cors_origins == [
        "https://app.example.com",
        "http://localhost:3000",
    ]
    assert settings.cors_origin_regex is None


def test_supabase_configured_requires_url_and_key() -> None:
    incomplete = Settings(supabase_url="https://example.supabase.co")
    complete = Settings(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="publishable-key",
    )

    assert incomplete.supabase_configured is False
    assert complete.supabase_configured is True


def test_password_recovery_redirect_prefers_public_origin_in_production() -> None:
    settings = Settings(
        app_env="production",
        CORS_ORIGINS="http://localhost:3000,https://gestao-compras-web.vercel.app",
    )

    assert (
        settings.password_recovery_redirect_url
        == "https://gestao-compras-web.vercel.app/redefinir-senha"
    )


def test_supabase_admin_accepts_current_and_legacy_secret_names() -> None:
    current = Settings(
        supabase_url="https://example.supabase.co",
        SUPABASE_SECRET_KEY="sb_secret_example",
    )
    legacy = Settings(
        supabase_url="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="legacy-service-role",
    )

    assert current.supabase_admin_configured is True
    assert current.supabase_secret_key == "sb_secret_example"
    assert legacy.supabase_admin_configured is True
    assert legacy.supabase_secret_key == "legacy-service-role"


def test_default_cors_contains_public_and_local_origins() -> None:
    settings = Settings()

    assert "https://gestao-compras-web.vercel.app" in settings.cors_origins
    assert "http://localhost:3000" in settings.cors_origins
