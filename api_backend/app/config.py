from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Admins guaranteed to exist, regardless of environment configuration.
#
# This is deliberately in code, not env. External addresses can no longer log in
# (see allowed_email_domains), so if the deployed ADMIN_SEED_EMAILS still pointed
# at an outside address — e.g. the old mremmatola@gmail.com — the system would
# end up with NO reachable admin at all and nobody could get back in. Unioning a
# known @withbitnob.com address into the seed list makes that lockout impossible.
BOOTSTRAP_ADMIN_EMAILS = ["david.fowobaje@withbitnob.com"]


class Settings(BaseSettings):
    database_url: str = "sqlite:///./inventory.db"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    # Extra emails that automatically become admin when they register.
    # This is UNIONED with BOOTSTRAP_ADMIN_EMAILS below — see the note there.
    admin_seed_emails: str = ""

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
        """Env-configured seed admins UNIONED with the built-in bootstrap admins,
        so a stale/incorrect ADMIN_SEED_EMAILS can never lock everyone out."""
        configured = [e.strip().lower() for e in self.admin_seed_emails.split(",") if e.strip()]
        return list(dict.fromkeys(configured + [e.lower() for e in BOOTSTRAP_ADMIN_EMAILS]))

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
