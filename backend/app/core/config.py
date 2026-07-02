from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/ceisa"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    SECRET_KEY: str = "ceisa_secret_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # API key that DeclarAI (CDP) must send when submitting declarations
    CDP_API_KEY: str = "cdp-declarai-key-2026"

    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5174"

    class Config:
        env_file = ".env"

settings = Settings()
