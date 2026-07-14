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
