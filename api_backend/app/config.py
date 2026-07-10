from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./inventory.db"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    admin_seed_emails: str = ""
    gemini_api_key: str = ""
    slack_bot_token: str = ""
    slack_signing_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def _normalize_postgres_scheme(cls, v: str) -> str:
        # Some providers (Heroku, Prisma) hand out the legacy `postgres://`
        # scheme, which SQLAlchemy 1.4+/2.0 no longer recognizes.
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @property
    def admin_seed_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_seed_emails.split(",") if e.strip()]


settings = Settings()
