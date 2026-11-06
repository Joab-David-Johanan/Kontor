from typing import Annotated, cast

from fastapi import APIRouter, Depends
from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.deps import CurrentTenantUser
from core.models import Conversation, UsageSnapshot
from core.schemas import (
    ApiMetrics,
    ChannelCounts,
    Dashboard,
    StatusCounts,
    TicketMetrics,
    UsageMetrics,
)
from core.values import CHANNELS, CONVERSATION_STATUSES, MetricsSource

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
async def dashboard(
    user: CurrentTenantUser,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Dashboard:
    """Ticket metrics calculated in SQL for the caller's tenant, plus the latest usage snapshot."""
    mine = Conversation.tenant_id == user.tenant_id

    by_status = dict.fromkeys(CONVERSATION_STATUSES, 0)
    status_rows = await session.execute(
        select(Conversation.status, func.count()).where(mine).group_by(Conversation.status)
    )
    for status_value, count in status_rows:
        by_status[status_value] = count  # type: ignore[index]

    by_channel = dict.fromkeys(CHANNELS, 0)
    channel_rows = await session.execute(
        select(Conversation.channel, func.count()).where(mine).group_by(Conversation.channel)
    )
    for channel, count in channel_rows:
        by_channel[channel] = count  # type: ignore[index]

    flag = func.unnest(Conversation.flags).label("flag")
    flag_rows = await session.execute(
        select(flag, func.count()).where(mine).group_by(literal_column("flag"))
    )
    flag_counts = {str(name): int(count) for name, count in flag_rows}

    total = sum(by_status.values())
    tickets = TicketMetrics(
        total=total,
        open=total - by_status["resolved"],
        by_status=StatusCounts(**by_status),
        by_channel=ChannelCounts(**by_channel),
        flag_counts=flag_counts,
    )

    snapshot = await session.scalar(
        select(UsageSnapshot)
        .where(UsageSnapshot.tenant_id == user.tenant_id)
        .order_by(UsageSnapshot.captured_at.desc())
        .limit(1)
    )
    if snapshot is None:
        return Dashboard(tickets=tickets, api=None, usage=None)

    return Dashboard(
        tickets=tickets,
        api=ApiMetrics(
            source=cast(MetricsSource, snapshot.source),
            requests_24h=snapshot.requests_24h,
            error_rate_pct=snapshot.error_rate_pct,
            p95_latency_ms=snapshot.p95_latency_ms,
            uptime_pct=snapshot.uptime_pct,
            requests_per_hour=snapshot.requests_per_hour,
        ),
        usage=UsageMetrics(
            active_staff=snapshot.active_staff,
            documents_indexed=snapshot.documents_indexed,
            automation_rate_pct=snapshot.automation_rate_pct,
            avg_first_response_sec=snapshot.avg_first_response_sec,
        ),
    )
