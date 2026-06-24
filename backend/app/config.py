"""
Application configuration loaded from environment variables.
All secrets and service URLs are centralized here — no hardcoded values.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # ── Supabase ──
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str

    # ── Google Earth Engine ──
    GEE_PROJECT_ID: str = ""
    GEE_SERVICE_ACCOUNT_PATH: str = ""

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
