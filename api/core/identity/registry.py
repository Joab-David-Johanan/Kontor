"""Adapter registry for the IdentityProvider port.

Maps a name from configuration (KONTOR_IDENTITY_PROVIDER) to an adapter.
An unknown name fails at startup with a clear message, not at the first request.
"""

from collections.abc import Callable
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from core.config import Settings, get_settings
from core.db import get_sessionmaker
from core.identity.adapters.oidc import OidcIdentityProvider
from core.identity.base import IdentityProvider

AdapterFactory = Callable[[Settings, async_sessionmaker[AsyncSession]], IdentityProvider]

ADAPTERS: dict[str, AdapterFactory] = {
    "oidc": OidcIdentityProvider,  # OpenID Connect access tokens (Keycloak, Entra ID, …)
}


def build_identity_provider(
    settings: Settings, sessionmaker: async_sessionmaker[AsyncSession]
) -> IdentityProvider:
    factory = ADAPTERS.get(settings.identity_provider)
    if factory is None:
        available = ", ".join(sorted(ADAPTERS))
        raise RuntimeError(
            f"Unknown identity provider '{settings.identity_provider}'. Available: {available}."
        )
    return factory(settings, sessionmaker)


@lru_cache
def get_identity_provider() -> IdentityProvider:
    return build_identity_provider(get_settings(), get_sessionmaker())
