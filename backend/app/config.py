"""Application configuration.

All secrets are read from the environment (or a local .env file).
Nothing sensitive is ever hardcoded or shipped to the frontend.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List
from urllib.parse import quote_plus

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        # Without this, pydantic-settings JSON-decodes list-typed fields
        # straight from .env and rejects `A,B,C` before `_split_csv` below
        # ever runs. Disabling it lets the documented comma-separated form work.
        enable_decoding=False,
    )

    # --- Core ---------------------------------------------------------------
    app_env: str = "development"
    app_name: str = "AtmosIQ API"
    app_version: str = "1.0.0"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 12

    # Local fallback. Overridden automatically when Turso credentials exist.
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'atmosiq.db').as_posix()}"

    # --- Turso / libSQL -----------------------------------------------------
    # Set both to run against Turso. The libSQL dialect speaks SQLite, so every
    # model, query, and migration is identical to the local file database.
    turso_database_url: str = ""   # e.g. libsql://atmosiq-org.turso.io
    turso_auth_token: str = ""

    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # --- Google AI ----------------------------------------------------------
    google_gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: float = 45.0

    # --- Optional external providers (graceful degradation when absent) -----
    weather_api_key: str = ""
    google_maps_api_key: str = ""
    google_earth_engine_project: str = ""

    # --- Deployment region defaults (no country is hardcoded in logic) ------
    default_country_code: str = "IN"
    default_region_code: str = "IN-DL"

    # --- Uploads ------------------------------------------------------------
    upload_dir: Path = BASE_DIR / "static" / "uploads"
    max_upload_bytes: int = 8 * 1024 * 1024  # 8 MB
    allowed_image_types: List[str] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/webp"]
    )

    @field_validator("cors_origins", "allowed_image_types", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        """Allow `A,B,C` strings in .env for list-typed settings."""
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    # --- Derived ------------------------------------------------------------
    @property
    def turso_enabled(self) -> bool:
        return bool(self.turso_database_url.strip() and self.turso_auth_token.strip())

    @property
    def resolved_database_url(self) -> str:
        """The SQLAlchemy URL the engine actually uses.

        Turso wins when configured, so deploying to it is purely an environment
        change — no code path differs. A `libsql://` host is rewritten into the
        `sqlite+libsql://` dialect URL that SQLAlchemy expects, with the auth
        token passed as a query parameter.
        """
        if not self.turso_enabled:
            return self.database_url

        host = self.turso_database_url.strip()
        for prefix in ("libsql://", "https://", "wss://", "sqlite+libsql://"):
            if host.startswith(prefix):
                host = host[len(prefix):]
                break
        host = host.rstrip("/")
        token = quote_plus(self.turso_auth_token.strip())
        # `libsql_https` rather than `libsql`: current Turso instances reject
        # the legacy Hrana WebSocket handshake with HTTP 400, so the transport
        # has to be HTTPS. See app/database/libsql_https.py.
        return f"sqlite+libsql_https://{host}/?authToken={token}&secure=true"

    @property
    def database_backend(self) -> str:
        """Human-readable backend name for /api/health."""
        if self.turso_enabled:
            return "turso-libsql"
        if self.database_url.startswith("sqlite"):
            return "sqlite"
        if self.database_url.startswith("postgresql"):
            return "postgresql"
        return "unknown"

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.google_gemini_api_key.strip())

    @property
    def ai_provider(self) -> str:
        """Reported to the UI so judges can see which path is live."""
        return "GEMINI" if self.gemini_enabled else "DEMO_MODE"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    return settings


settings = get_settings()
