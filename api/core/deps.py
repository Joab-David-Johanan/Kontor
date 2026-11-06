"""FastAPI dependencies: authentication and authorisation for every endpoint.

The tenant ALWAYS comes from the authenticated caller, on the server. No endpoint
accepts a tenant id from the URL, query string or request body.
"""

import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.identity.base import Principal
from core.identity.registry import get_identity_provider
from core.values import Role

bearer = HTTPBearer(auto_error=False, description="OpenID Connect access token (JWT)")


async def get_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    if credentials is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Missing bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    principal = await get_identity_provider().authenticate(credentials.credentials)
    if principal is None:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Unknown or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return principal


@dataclass(frozen=True)
class TenantUser:
    """A caller who belongs to a tenant. tenant_id is guaranteed to be set."""

    user_id: uuid.UUID
    name: str
    role: Role
    tenant_id: str
    tenant_name: str


async def require_tenant_user(
    principal: Annotated[Principal, Depends(get_principal)],
) -> TenantUser:
    if principal.tenant_id is None or principal.tenant_name is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This endpoint is for tenant staff.")
    return TenantUser(
        user_id=principal.user_id,
        name=principal.name,
        role=principal.role,
        tenant_id=principal.tenant_id,
        tenant_name=principal.tenant_name,
    )


async def require_tenant_admin(
    user: Annotated[TenantUser, Depends(require_tenant_user)],
) -> TenantUser:
    if user.role != "tenant_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can view security settings.")
    return user


async def require_platform_staff(
    principal: Annotated[Principal, Depends(get_principal)],
) -> Principal:
    if principal.role != "platform_staff":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This endpoint is for platform staff.")
    return principal


CurrentPrincipal = Annotated[Principal, Depends(get_principal)]
CurrentTenantUser = Annotated[TenantUser, Depends(require_tenant_user)]
CurrentTenantAdmin = Annotated[TenantUser, Depends(require_tenant_admin)]
CurrentPlatformStaff = Annotated[Principal, Depends(require_platform_staff)]
