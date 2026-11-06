"""Sign-in and sign-out are recorded in the tenant's audit log."""

import pytest
from httpx import AsyncClient

from tests.tokens import HOSPITAL, OPERATOR, PLATFORM

pytestmark = pytest.mark.anyio


async def test_sign_in_and_out_appear_in_the_audit_log(client: AsyncClient) -> None:
    for event in ["signed_in", "signed_out"]:
        response = await client.post("/me/session-events", json={"event": event}, headers=OPERATOR)
        assert response.status_code == 204

    audit = (await client.get("/security", headers=HOSPITAL)).json()["auditLog"]
    jonas = [e["action"] for e in audit if e["actor"] == "Jonas Keller"]
    assert "Signed in" in jonas
    assert "Signed out" in jonas


async def test_sign_in_updates_last_login(client: AsyncClient) -> None:
    before = (await client.get("/security", headers=HOSPITAL)).json()["users"]
    await client.post("/me/session-events", json={"event": "signed_in"}, headers=HOSPITAL)
    after = (await client.get("/security", headers=HOSPITAL)).json()["users"]
    anna = lambda users: next(u for u in users if u["name"] == "Dr. Anna Weber")  # noqa: E731
    assert anna(after)["lastLoginAt"] > anna(before)["lastLoginAt"]


async def test_platform_staff_events_are_accepted(client: AsyncClient) -> None:
    response = await client.post(
        "/me/session-events", json={"event": "signed_in"}, headers=PLATFORM
    )
    assert response.status_code == 204


async def test_unknown_event_is_rejected(client: AsyncClient) -> None:
    response = await client.post("/me/session-events", json={"event": "hacked"}, headers=HOSPITAL)
    assert response.status_code == 422
