"""Cursor (keyset) pagination of conversations."""

import pytest
from httpx import AsyncClient

from tests.tokens import HOSPITAL

pytestmark = pytest.mark.anyio


async def test_pages_cover_every_conversation_once_newest_first(client: AsyncClient) -> None:
    refs: list[str] = []
    started: list[str] = []
    cursor = None
    for _ in range(10):  # safety limit
        params = {"limit": 2, **({"cursor": cursor} if cursor else {})}
        page = (await client.get("/conversations", params=params, headers=HOSPITAL)).json()
        refs += [c["ref"] for c in page["items"]]
        started += [c["startedAt"] for c in page["items"]]
        cursor = page["nextCursor"]
        if cursor is None:
            break
    assert sorted(refs) == ["C-1001", "C-1002", "C-1003", "C-1004", "C-1005"]
    assert started == sorted(started, reverse=True)


async def test_limit_is_capped(client: AsyncClient) -> None:
    response = await client.get("/conversations", params={"limit": 1000}, headers=HOSPITAL)
    assert response.status_code == 422


async def test_garbage_cursor_is_rejected(client: AsyncClient) -> None:
    response = await client.get("/conversations", params={"cursor": "nonsense"}, headers=HOSPITAL)
    assert response.status_code == 400
