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
    # JWT_SECRET_KEY MUST be supplied via environment / .env file.
    # No default is provided so a misconfigured deployment fails loudly
    # instead of signing tokens with a publicly-known string.
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ───────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Security and caching
    RATE_LIMIT_REQUESTS: int = 120
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    AUTH_RATE_LIMIT_REQUESTS: int = 10
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60
    PUBLIC_CACHE_MAX_AGE_SECONDS: int = 300

    # ── Pagination ─────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
