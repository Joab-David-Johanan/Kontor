import base64
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.deps import CurrentTenantUser
from core.models import Conversation as ConversationRow
from core.schemas import Conversation, ConversationPage

router = APIRouter(tags=["conversations"])


def encode_cursor(started_at: datetime, row_id: uuid.UUID) -> str:
    raw = f"{started_at.isoformat()}|{row_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        started, row_id = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        return datetime.fromisoformat(started), uuid.UUID(row_id)
    except (ValueError, UnicodeDecodeError) as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid cursor.") from error


@router.get("/conversations")
async def list_conversations(
    user: CurrentTenantUser,
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    cursor: str | None = None,
) -> ConversationPage:
    """The caller's tenant's conversations, newest first, with cursor (keyset) pagination."""
    query = (
        select(ConversationRow)
        .where(ConversationRow.tenant_id == user.tenant_id)
        .order_by(ConversationRow.started_at.desc(), ConversationRow.id.desc())
        .limit(limit + 1)  # one extra row tells us whether another page exists
    )
    if cursor:
        started_at, row_id = decode_cursor(cursor)
        query = query.where(
            tuple_(ConversationRow.started_at, ConversationRow.id) < tuple_(started_at, row_id)
        )

    rows = list((await session.scalars(query)).all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_cursor = encode_cursor(rows[-1].started_at, rows[-1].id) if has_more else None

    return ConversationPage(
        items=[
            Conversation.model_validate(
                {
                    "id": r.id,
                    "ref": r.ref,
                    "channel": r.channel,
                    "contact_name": r.contact_name,
                    "contact": r.contact,
                    "summary": r.summary,
                    "status": r.status,
                    "flags": r.flags,
                    "attributes": r.attributes,
                    "started_at": r.started_at,
                }
            )
            for r in rows
        ],
        next_cursor=next_cursor,
    )
