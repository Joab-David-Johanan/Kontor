"""The IdentityProvider PORT.

A port is a small interface the core owns. Adapters implement it:
- oidc (Milestone 3): verifies OpenID Connect access tokens from Keycloak
  (the same adapter later accepts a hospital's own Microsoft Entra ID via Keycloak)
- dev_token (Milestone 2, removed): fixed development tokens

The rest of the core only ever sees a Principal, never how it was obtained.
"""

import uuid
from dataclasses import dataclass
from typing import Protocol

from core.values import Role


@dataclass(frozen=True)
class Principal:
    """The authenticated caller."""

    user_id: uuid.UUID
    name: str
    email: str
    role: Role
    tenant_id: str | None  # None for platform staff
    tenant_name: str | None


class IdentityProvider(Protocol):
    """Turn a credential (e.g. a bearer token) into a Principal, or None if unknown."""

    name: str

    async def authenticate(self, credential: str) -> Principal | None: ...
