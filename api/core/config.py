"""Configuration, read ONLY from environment variables (twelve-factor).

Every setting can be overridden with an environment variable prefixed KONTOR_,
e.g. KONTOR_DATABASE_URL. A local .env file is read too (never committed).
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KONTOR_", env_file=".env", extra="ignore")

    # dev / test / production. Dev-only features (seeding, static test keys) refuse production.
    environment: Literal["dev", "test", "production"] = "dev"

    database_url: str = "postgresql+asyncpg://kontor:kontor@localhost:5433/kontor"

    # "queue" = normal connection pool; "null" = no pooling (used by tests, which
    # open a new event loop per test and must not reuse connections across loops).
    db_pool: Literal["queue", "null"] = "queue"

    # Which IdentityProvider adapter to use (see core/identity/registry.py).
    identity_provider: str = "oidc"

    # ── OpenID Connect (Keycloak) ──
    # The address browsers use for Keycloak. Tokens carry it in their "iss" claim.
    oidc_public_base: str = "http://localhost:8080"
    # The address THIS service uses to reach Keycloak (inside Compose: http://keycloak:8080).
    oidc_internal_base: str = "http://localhost:8080"
    # Realm for tenant (customer) staff, and a separate realm for platform staff.
    oidc_tenant_realm: str = "customers"
    oidc_staff_realm: str = "kontor-staff"
    # Access tokens must be issued FOR this API (the "aud" claim).
    oidc_audience: str = "kontor-api"
    # Tests only: a fixed JSON Web Key Set instead of fetching Keycloak's keys.
    oidc_static_jwks: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
