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
