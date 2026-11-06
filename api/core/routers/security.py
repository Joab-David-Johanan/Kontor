from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.deps import CurrentTenantAdmin
from core.models import ApiKey as ApiKeyRow
from core.models import AuditEvent as AuditEventRow
from core.models import SecuritySettings, User
from core.schemas import ApiKey, AuditEvent, SecurityOverview, StaffUser
from core.values import Role

router = APIRouter(tags=["security"])


@router.get("/security")
async def security_overview(
    user: CurrentTenantAdmin,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SecurityOverview:
    """Sign-in rules, staff accounts, API keys and audit log of the caller's tenant.

    Tenant admins only: operators get 403."""
    settings = await session.get(SecuritySettings, user.tenant_id)
    if settings is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No security settings for this tenant.")

    staff = await session.scalars(
        select(User).where(User.tenant_id == user.tenant_id).order_by(User.name)
    )
    keys = await session.scalars(
        select(ApiKeyRow)
        .where(ApiKeyRow.tenant_id == user.tenant_id)
        .order_by(ApiKeyRow.created_at)
    )
    events = await session.scalars(
        select(AuditEventRow)
        .where(AuditEventRow.tenant_id == user.tenant_id)
        .order_by(AuditEventRow.at.desc())
        .limit(50)
    )

    return SecurityOverview(
        mfa_required=settings.mfa_required,
        sso_provider=settings.sso_provider,
        session_timeout_min=settings.session_timeout_min,
        ip_allowlist=settings.ip_allowlist,
        data_region=settings.data_region,
        retention_days=settings.retention_days,
        pii_redaction=settings.pii_redaction,
        users=[
            StaffUser(
                name=u.name,
                email=u.email,
                role=_role(u.role),
                mfa_enabled=u.mfa_enabled,
                last_login_at=u.last_login_at,
            )
            for u in staff
        ],
        api_keys=[
            ApiKey(
                id=k.id,
                label=k.label,
                last_four=k.last_four,
                created_at=k.created_at,
                last_used_at=k.last_used_at,
            )
            for k in keys
        ],
        audit_log=[AuditEvent(at=e.at, actor=e.actor, action=e.action) for e in events],
    )


def _role(value: str) -> Role:
    if value == "tenant_admin":
        return "tenant_admin"
    if value == "tenant_operator":
        return "tenant_operator"
    return "platform_staff"
