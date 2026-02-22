from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    APP_NAME: str = "Learner"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://learner:learner@localhost:5432/learner"

    # File storage
    STORAGE_MODE: str = "local"  # "local" or "r2"
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 100

    # Cloudflare R2 Storage (required when STORAGE_MODE=r2)
    R2_BUCKET_NAME: str = ""
    R2_ENDPOINT_URL: str = ""  # https://<account_id>.r2.cloudflarestorage.com
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""

    # Cloudflare Workers AI
    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_TOKEN: str = ""
    CLOUDFLARE_MODEL: str = "@cf/openai/gpt-oss-120b"

    # YouTube Data API v3
    YOUTUBE_API_KEY: str = ""

    # Rate limiting (requests per minute)
    LLM_RATE_LIMIT: int = 10
    YOUTUBE_RATE_LIMIT: int = 5

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Auth0
    AUTH0_DOMAIN: str = ""
    AUTH0_AUDIENCE: str = ""
    AUTH0_ISSUER: str = ""  # Optional override; defaults to https://<AUTH0_DOMAIN>/
    AUTH0_ROLES_CLAIM: str = "https://learner.app/roles"
    AUTH0_ADMIN_ROLE: str = "admin"
    AUTH0_JWKS_CACHE_SECONDS: int = 300
    AUTH0_USERINFO_TIMEOUT_SECONDS: int = 5

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


settings = Settings()
