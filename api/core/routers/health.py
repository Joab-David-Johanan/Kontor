from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.schemas import Health

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(session: Annotated[AsyncSession, Depends(get_session)]) -> Health:
    """Liveness + database check. No authentication."""
    await session.execute(text("SELECT 1"))
    return Health(status="ok", database="ok")
