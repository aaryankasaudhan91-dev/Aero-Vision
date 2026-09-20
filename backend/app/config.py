"""
Application configuration loaded from environment variables.
All secrets and service URLs are centralized here — no hardcoded values.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=(str(_ENV_FILE), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Supabase ──
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = ""

    # ── Google Earth Engine ──
    GEE_PROJECT_ID: str = ""
    GEE_SERVICE_ACCOUNT_PATH: str = ""
    GEE_SERVICE_ACCOUNT_JSON: str = ""

    # ── Email & Alert Dispatch System (Resend API) ──
    ALERT_ADMIN_EMAIL: str = "aaryankasaudhan91@gmail.com"
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "AeroVision Alerts <onboarding@resend.dev>"

    # ── Application ──
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── External APIs ──
    FIRMS_MAP_KEY: str = ""
    CDS_API_KEY: str = ""
    CDS_API_URL: str = "https://cds.climate.copernicus.eu/api"
    MOSDAC_USERNAME: str = ""
    MOSDAC_PASSWORD: str = ""
    DATA_GOV_IN_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
