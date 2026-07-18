from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Gestão de Compras API"
    api_v1_prefix: str = "/api/v1"
    cors_origins_raw: str = Field(
        default="http://localhost:3000",
        validation_alias="CORS_ORIGINS",
    )
    cors_origin_regex_raw: str = Field(
        default="",
        validation_alias="CORS_ORIGIN_REGEX",
    )

    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_request_timeout_seconds: float = 20.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        ]

    @property
    def cors_origin_regex(self) -> str | None:
        value = self.cors_origin_regex_raw.strip()
        return value or None

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url.strip() and self.supabase_publishable_key.strip())

    @property
    def password_recovery_redirect_url(self) -> str:
        origins = self.cors_origins
        if not origins:
            return "http://localhost:3000/redefinir-senha"

        if self.app_env.strip().lower() == "production":
            public_origins = [
                origin for origin in origins
                if "localhost" not in origin and "127.0.0.1" not in origin
            ]
            if public_origins:
                return f"{public_origins[0]}/redefinir-senha"

        return f"{origins[0]}/redefinir-senha"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
