from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./inventory.db"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    # Emails that automatically become admin when they register.
    #
    # ⚠️ MUST contain a @withbitnob.com address while allowed_email_domains is
    # set. External accounts can no longer log in, so seeding an outside address
    # (e.g. a gmail one) here would leave the system with NO reachable admin.
    admin_seed_emails: str = "david.fowobaje@withbitnob.com"

    gemini_api_key: str = ""
    slack_bot_token: str = ""
    slack_signing_secret: str = ""

    # Origins allowed to call the API from a browser. "*" is deliberately not
    # the default: it lets any site on the internet call this API.
    allowed_origins: str = (
        "https://bitnob-inventory.vercel.app,http://localhost:5173,http://localhost:5174"
    )

    # Company domains allowed to REGISTER and to LOG IN. This is an internal
    # tool on a public URL, so it's restricted to Bitnob staff addresses.
    # Empty = open to anyone (the old behaviour).
    allowed_email_domains: str = "withbitnob.com"

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

    @property
    def allowed_origin_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def allowed_email_domain_list(self) -> list[str]:
        return [
            d.strip().lower().lstrip("@")
            for d in self.allowed_email_domains.split(",")
            if d.strip()
        ]


settings = Settings()
