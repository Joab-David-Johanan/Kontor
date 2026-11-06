"""The leak test: one tenant must never receive another tenant's data, on ANY endpoint.

This is the former frontend leak row (c-2001), now enforced server-side.
"""

import pytest
from httpx import AsyncClient

from tests.tokens import BRENNER, HOSPITAL

pytestmark = pytest.mark.anyio

TENANT_ENDPOINTS = ["/me", "/conversations", "/dashboard", "/security", "/support-issues"]

BRENNER_MARKERS = ["brenner", "Brenner", "Petra", "Müller", "C-2001", "SUP-1042"]
HOSPITAL_MARKERS = ["hospital", "Klinikum", "Weber", "C-1001", "SUP-1041"]


@pytest.mark.parametrize("path", TENANT_ENDPOINTS)
async def test_hospital_never_sees_brenner_data(client: AsyncClient, path: str) -> None:
    response = await client.get(path, headers=HOSPITAL)
    assert response.status_code == 200
    for marker in BRENNER_MARKERS:
        assert marker not in response.text, f"{path} leaked {marker!r} to the hospital"


@pytest.mark.parametrize("path", TENANT_ENDPOINTS)
async def test_brenner_never_sees_hospital_data(client: AsyncClient, path: str) -> None:
    response = await client.get(path, headers=BRENNER)
    assert response.status_code == 200
    for marker in HOSPITAL_MARKERS:
        assert marker not in response.text, f"{path} leaked {marker!r} to brenner"


async def test_each_tenant_sees_exactly_its_own_conversations(client: AsyncClient) -> None:
    hospital = (await client.get("/conversations", headers=HOSPITAL)).json()["items"]
    brenner = (await client.get("/conversations", headers=BRENNER)).json()["items"]
    assert {c["ref"] for c in hospital} == {"C-1001", "C-1002", "C-1003", "C-1004", "C-1005"}
    assert {c["ref"] for c in brenner} == {"C-2001"}


async def test_dashboard_counts_only_own_tickets(client: AsyncClient) -> None:
    dashboard = (await client.get("/dashboard", headers=HOSPITAL)).json()
    tickets = dashboard["tickets"]
    assert tickets["total"] == 5
    assert tickets["open"] == 3
    assert tickets["flagCounts"] == {"emergency": 1}
    # Exact JSON key names the frontend relies on (automatic camelCase would give
    # "requests24H"; the schema sets the alias explicitly).
    assert dashboard["api"]["requests24h"] == 18_420
    assert set(tickets["byStatus"]) == {"active", "waiting_approval", "resolved", "escalated"}
