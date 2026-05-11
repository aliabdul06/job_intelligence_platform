from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "Job Intelligence Platform API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── MongoDB ────────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "job_intelligence"

    # ── JWT Authentication ─────────────────────────────────────
    JWT_SECRET_KEY: str = "job-intel-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ───────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]

    # ── Pagination ─────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
