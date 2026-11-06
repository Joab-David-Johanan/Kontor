"""API request/response models (Pydantic v2): the contract between core and clients.

These classes are the SOURCE OF TRUTH for the API. FastAPI turns them into the
OpenAPI schema (api/openapi.json), and the frontend's TypeScript types are generated
from that file. JSON field names are camelCase (e.g. contactName), the JavaScript
convention; Python code uses snake_case.
"""

import re
import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator
from pydantic.alias_generators import to_camel

from core.values import (
    Channel,
    ConversationStatus,
    IssueCategory,
    IssueSeverity,
    IssueStatus,
    MetricsSource,
    Role,
)


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ── Me ──────────────────────────────────────────────────────


class TenantRef(ApiModel):
    id: str
    name: str


class Me(ApiModel):
    user_id: uuid.UUID
    name: str
    email: str
    role: Role
    tenant: TenantRef | None  # None for platform staff


# ── Conversations ───────────────────────────────────────────


class Conversation(ApiModel):
    id: uuid.UUID
    ref: str  # human-readable code, e.g. "C-1001"
    channel: Channel
    contact_name: str
    contact: str | None
    summary: str
    status: ConversationStatus
    flags: list[str]  # plugin-defined markers, e.g. "emergency"
    attributes: dict[str, Any]
    started_at: datetime


class ConversationPage(ApiModel):
    items: list[Conversation]
    next_cursor: str | None  # pass back as ?cursor= to get the next page; None = last page


# ── Dashboard ───────────────────────────────────────────────


class StatusCounts(BaseModel):
    """One count per status. Field names ARE the status values (no camelCase)."""

    active: int
    waiting_approval: int
    resolved: int
    escalated: int


class ChannelCounts(BaseModel):
    voice: int
    whatsapp: int
    outlook: int
    web: int


class TicketMetrics(ApiModel):
    total: int
    open: int  # everything not resolved
    by_status: StatusCounts
    by_channel: ChannelCounts
    flag_counts: dict[str, int]  # e.g. {"emergency": 1}


class ApiMetrics(ApiModel):
    source: MetricsSource  # "seed" until tracing measures real numbers
    # explicit alias: the automatic camelCase would give "requests24H"
    requests_24h: int = Field(alias="requests24h")
    error_rate_pct: float
    p95_latency_ms: int
    uptime_pct: float
    requests_per_hour: list[int]  # 24 values, index 0 = 00:00–00:59


class UsageMetrics(ApiModel):
    active_staff: int
    documents_indexed: int
    automation_rate_pct: float
    avg_first_response_sec: float


class Dashboard(ApiModel):
    tickets: TicketMetrics
    api: ApiMetrics | None
    usage: UsageMetrics | None


# ── Security ────────────────────────────────────────────────


class StaffUser(ApiModel):
    name: str
    email: str
    role: Role
    mfa_enabled: bool
    last_login_at: datetime | None


class ApiKey(ApiModel):
    id: uuid.UUID
    label: str
    last_four: str
    created_at: datetime
    last_used_at: datetime | None


class AuditEvent(ApiModel):
    at: datetime
    actor: str
    action: str


class SecurityOverview(ApiModel):
    mfa_required: bool
    sso_provider: str | None
    session_timeout_min: int
    ip_allowlist: list[str]
    data_region: str
    retention_days: int
    pii_redaction: bool
    users: list[StaffUser]
    api_keys: list[ApiKey]
    audit_log: list[AuditEvent]


# ── Support ─────────────────────────────────────────────────


class SupportIssue(ApiModel):
    id: uuid.UUID
    ref: str  # e.g. "SUP-1046"
    tenant_id: str
    tenant_name: str
    title: str
    description: str
    category: IssueCategory
    severity: IssueSeverity
    status: IssueStatus
    reporter: str
    related_ticket_ref: str | None
    created_at: datetime
    updated_at: datetime


Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=5, max_length=120)]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=20, max_length=2000)
]
TICKET_REF = re.compile(r"^C-\d+$")


class NewSupportIssue(ApiModel):
    """What a tenant sends. Tenant, reporter, status, ref and dates are set by the server."""

    title: Title
    description: Description
    category: IssueCategory
    severity: IssueSeverity
    related_ticket_ref: str | None = None

    @field_validator("related_ticket_ref")
    @classmethod
    def normalise_ticket_ref(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip().upper()
        if not TICKET_REF.match(value):
            raise ValueError("Use a ticket number like C-1002.")
        return value


class SessionEvent(ApiModel):
    """Sent by the web app right after sign-in and right before sign-out."""

    event: Literal["signed_in", "signed_out"]


class Health(BaseModel):
    status: Literal["ok"]
    database: Literal["ok"]
