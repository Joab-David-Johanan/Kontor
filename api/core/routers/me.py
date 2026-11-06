from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.deps import CurrentPrincipal
from core.models import AuditEvent, User
from core.schemas import Me, SessionEvent, TenantRef

router = APIRouter(tags=["identity"])


@router.get("/me")
async def me(principal: CurrentPrincipal) -> Me:
    """Who is calling: user, role and tenant (None for platform staff)."""
    tenant = (
        TenantRef(id=principal.tenant_id, name=principal.tenant_name)
        if principal.tenant_id and principal.tenant_name
        else None
    )
    return Me(
        user_id=principal.user_id,
        name=principal.name,
        email=principal.email,
        role=principal.role,
        tenant=tenant,
    )


@router.post("/me/session-events", status_code=status.HTTP_204_NO_CONTENT)
async def record_session_event(
    body: SessionEvent,
    principal: CurrentPrincipal,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Record a sign-in or sign-out in the tenant's audit log (shown on the Security page)."""
    now = datetime.now(UTC)
    if body.event == "signed_in":
        await session.execute(
            update(User).where(User.id == principal.user_id).values(last_login_at=now)
        )
    if principal.tenant_id is not None:  # platform staff have no tenant audit log
        action = "Signed in" if body.event == "signed_in" else "Signed out"
        session.add(
            AuditEvent(tenant_id=principal.tenant_id, at=now, actor=principal.name, action=action)
        )
    await session.commit()
