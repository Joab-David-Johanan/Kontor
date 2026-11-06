"""Support issues: validation, ownership of related tickets, and unique codes."""

import asyncio
import re
from typing import Any

import pytest
from httpx import AsyncClient

from tests.tokens import BRENNER, HOSPITAL

pytestmark = pytest.mark.anyio

VALID: dict[str, Any] = {
    "title": "Approvals stay pending",
    "description": "Approved letters stay in 'Needs approval' for twenty minutes.",
    "category": "integration",
    "severity": "medium",
}


def error_fields(response_json: dict[str, Any]) -> set[str]:
    return {str(error["loc"][-1]) for error in response_json["detail"]}


async def test_too_short_fields_are_rejected(client: AsyncClient) -> None:
    body = {**VALID, "title": "Hi", "description": "too short"}
    response = await client.post("/support-issues", json=body, headers=HOSPITAL)
    assert response.status_code == 422
    assert error_fields(response.json()) == {"title", "description"}


async def test_unknown_category_is_rejected(client: AsyncClient) -> None:
    body = {**VALID, "category": "gossip"}
    response = await client.post("/support-issues", json=body, headers=HOSPITAL)
    assert response.status_code == 422
    assert error_fields(response.json()) == {"category"}


async def test_badly_formatted_ticket_ref_is_rejected(client: AsyncClient) -> None:
    body = {**VALID, "relatedTicketRef": "ticket 12"}
    response = await client.post("/support-issues", json=body, headers=HOSPITAL)
    assert response.status_code == 422
    assert error_fields(response.json()) == {"relatedTicketRef"}


async def test_another_tenants_ticket_cannot_be_referenced(client: AsyncClient) -> None:
    body = {**VALID, "relatedTicketRef": "c-2001"}  # brenner's ticket, lower case on purpose
    response = await client.post("/support-issues", json=body, headers=HOSPITAL)
    assert response.status_code == 422
    assert error_fields(response.json()) == {"relatedTicketRef"}
    assert "No ticket C-2001" in response.json()["detail"][0]["msg"]


async def test_created_issue_belongs_to_the_caller_whatever_the_body_says(
    client: AsyncClient,
) -> None:
    body = {**VALID, "relatedTicketRef": "c-1002", "tenantId": "brenner"}  # ignored field
    response = await client.post("/support-issues", json=body, headers=HOSPITAL)
    assert response.status_code == 201
    issue = response.json()
    assert re.fullmatch(r"SUP-\d+", issue["ref"])
    assert issue["tenantId"] == "hospital"
    assert issue["reporter"] == "Dr. Anna Weber"
    assert issue["relatedTicketRef"] == "C-1002"
    assert issue["status"] == "open"

    hospital_refs = {
        i["ref"] for i in (await client.get("/support-issues", headers=HOSPITAL)).json()
    }
    brenner_refs = {i["ref"] for i in (await client.get("/support-issues", headers=BRENNER)).json()}
    assert issue["ref"] in hospital_refs
    assert issue["ref"] not in brenner_refs


async def test_simultaneous_submissions_get_unique_codes(client: AsyncClient) -> None:
    # The old frontend used "highest number + 1", which breaks under concurrency.
    responses = await asyncio.gather(
        *(client.post("/support-issues", json=VALID, headers=HOSPITAL) for _ in range(8))
    )
    assert all(r.status_code == 201 for r in responses)
    refs = [r.json()["ref"] for r in responses]
    assert len(set(refs)) == len(refs)
