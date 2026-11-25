from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ChargeWise API"
    app_env: str = "development"
    port: int = 8001
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    database_url: str = (
        "postgresql+psycopg://chargewise:chargewise_dev_pass@localhost:5432/chargewise"
    )

    firebase_project_id: str = "demo-chargewise"
    firebase_service_account_json: str | None = None
    firebase_check_revoked: bool = False
    firebase_auth_emulator_host: str | None = None
    firestore_emulator_host: str | None = None

    osrm_base_url: str = "https://router.project-osrm.org"
    open_meteo_elevation_url: str = "https://api.open-meteo.com/v1/elevation"
    ocm_api_key: str | None = None

    rate_limit_per_minute: int = 120

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                return "postgresql+psycopg://" + v[len("postgres://"):]
            if v.startswith("postgresql://"):
                return "postgresql+psycopg://" + v[len("postgresql://"):]
        return v

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
