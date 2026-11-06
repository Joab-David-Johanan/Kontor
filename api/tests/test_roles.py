"""Authentication (401) and role checks (403)."""

import pytest
from httpx import AsyncClient

from tests.tokens import HOSPITAL, OPERATOR, PLATFORM, UNKNOWN

pytestmark = pytest.mark.anyio

PROTECTED = [
    "/me",
    "/conversations",
    "/dashboard",
    "/security",
    "/support-issues",
    "/platform/support-issues",
]


@pytest.mark.parametrize("path", PROTECTED)
async def test_missing_token_is_rejected(client: AsyncClient, path: str) -> None:
    assert (await client.get(path)).status_code == 401


@pytest.mark.parametrize("path", PROTECTED)
async def test_unknown_token_is_rejected(client: AsyncClient, path: str) -> None:
    assert (await client.get(path, headers=UNKNOWN)).status_code == 401


async def test_tenant_staff_cannot_open_the_platform_queue(client: AsyncClient) -> None:
    response = await client.get("/platform/support-issues", headers=HOSPITAL)
    assert response.status_code == 403


@pytest.mark.parametrize("path", ["/conversations", "/dashboard", "/security", "/support-issues"])
async def test_platform_staff_get_no_tenant_endpoints(client: AsyncClient, path: str) -> None:
    # Platform staff belong to no tenant, so tenant data endpoints refuse them.
    assert (await client.get(path, headers=PLATFORM)).status_code == 403


async def test_platform_me_has_no_tenant(client: AsyncClient) -> None:
    me = (await client.get("/me", headers=PLATFORM)).json()
    assert me["role"] == "platform_staff"
    assert me["tenant"] is None


async def test_platform_queue_has_every_tenant_in_triage_order(client: AsyncClient) -> None:
    issues = (await client.get("/platform/support-issues", headers=PLATFORM)).json()
    assert {i["tenantName"] for i in issues} >= {"Klinikum Demo", "Brenner Holzbau"}
    rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    ranks = [rank[i["severity"]] for i in issues]
    assert ranks == sorted(ranks), "most severe issues must come first"


async def test_only_tenant_admins_see_security_settings(client: AsyncClient) -> None:
    assert (await client.get("/security", headers=HOSPITAL)).status_code == 200
    response = await client.get("/security", headers=OPERATOR)
    assert response.status_code == 403
    assert response.json()["detail"] == "Only admins can view security settings."


async def test_operators_still_work_tickets_and_support(client: AsyncClient) -> None:
    for path in ["/conversations", "/dashboard", "/support-issues"]:
        assert (await client.get(path, headers=OPERATOR)).status_code == 200
