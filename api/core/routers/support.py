from typing import Annotated, Any, cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import Select, case, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.deps import CurrentPlatformStaff, CurrentTenantUser
from core.models import Conversation, Tenant, User
from core.models import SupportIssue as SupportIssueRow
from core.schemas import NewSupportIssue, SupportIssue
from core.values import IssueCategory, IssueSeverity, IssueStatus

router = APIRouter(tags=["support"])


def _issue_query() -> Select[SupportIssueRow, str, str, str]:
    """Issue + tenant name + reporter name + related ticket code, in one query."""
    return (
        select(SupportIssueRow, Tenant.name, User.name, Conversation.ref)
        .join(Tenant, Tenant.id == SupportIssueRow.tenant_id)
        .join(User, User.id == SupportIssueRow.reporter_id)
        .outerjoin(Conversation, Conversation.id == SupportIssueRow.related_conversation_id)
    )


def _to_schema(row: Any) -> SupportIssue:
    issue, tenant_name, reporter, related_ref = row
    return SupportIssue(
        id=issue.id,
        ref=issue.ref,
        tenant_id=issue.tenant_id,
        tenant_name=tenant_name,
        title=issue.title,
        description=issue.description,
        category=cast(IssueCategory, issue.category),
        severity=cast(IssueSeverity, issue.severity),
        status=cast(IssueStatus, issue.status),
        reporter=reporter,
        related_ticket_ref=related_ref,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
    )


@router.get("/support-issues")
async def list_support_issues(
    user: CurrentTenantUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SupportIssue]:
    """The caller's tenant's issues, newest first."""
    query = (
        _issue_query()
        .where(SupportIssueRow.tenant_id == user.tenant_id)
        .order_by(SupportIssueRow.created_at.desc())
    )
    return [_to_schema(row) for row in await session.execute(query)]


@router.post("/support-issues", status_code=status.HTTP_201_CREATED)
async def create_support_issue(
    body: NewSupportIssue,
    user: CurrentTenantUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SupportIssue:
    """Raise an issue for the platform team. Tenant and reporter come from the caller."""
    related_id = None
    if body.related_ticket_ref:
        # The ticket must exist AND belong to the caller's tenant.
        related_id = await session.scalar(
            select(Conversation.id).where(
                Conversation.tenant_id == user.tenant_id,
                Conversation.ref == body.related_ticket_ref,
            )
        )
        if related_id is None:
            raise HTTPException(
                422,  # same status FastAPI uses for its own validation errors
                detail=[
                    {
                        "type": "value_error",
                        "loc": ["body", "relatedTicketRef"],
                        "msg": f"No ticket {body.related_ticket_ref} in your ticket system.",
                        "input": body.related_ticket_ref,
                    }
                ],
            )

    issue = SupportIssueRow(
        tenant_id=user.tenant_id,
        reporter_id=user.user_id,
        title=body.title,
        description=body.description,
        category=body.category,
        severity=body.severity,
        related_conversation_id=related_id,
    )
    session.add(issue)
    await session.flush()  # INSERT now: Postgres assigns id, ref (sequence) and dates
    row = (await session.execute(_issue_query().where(SupportIssueRow.id == issue.id))).one()
    await session.commit()
    return _to_schema(row)


# Triage order is a business rule, so it lives here in SQL, not in any client.
SEVERITY_RANK = case(
    {"critical": 0, "high": 1, "medium": 2, "low": 3},
    value=SupportIssueRow.severity,
)


@router.get("/platform/support-issues", tags=["platform"])
async def list_all_support_issues(
    _staff: CurrentPlatformStaff,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SupportIssue]:
    """Every tenant's issues for platform staff: most severe first, then longest waiting."""
    query = _issue_query().order_by(SEVERITY_RANK, SupportIssueRow.created_at.asc())
    return [_to_schema(row) for row in await session.execute(query)]
