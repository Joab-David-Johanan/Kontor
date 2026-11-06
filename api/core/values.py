"""Closed lists of allowed values, shared by the database checks and the API schemas.

Each list is written ONCE as a Literal type; the runtime tuple is derived from it,
so the database CHECK constraints and the OpenAPI enums can never disagree.
Domain words (e.g. "emergency") are NOT here: plugins add them as conversation flags.
"""

from typing import Literal, get_args

Channel = Literal["voice", "whatsapp", "outlook", "web"]
CHANNELS: tuple[Channel, ...] = get_args(Channel)

ConversationStatus = Literal["active", "waiting_approval", "resolved", "escalated"]
CONVERSATION_STATUSES: tuple[ConversationStatus, ...] = get_args(ConversationStatus)

Role = Literal["tenant_admin", "tenant_operator", "platform_staff"]
ROLES: tuple[Role, ...] = get_args(Role)
TENANT_ROLES: tuple[Role, ...] = ("tenant_admin", "tenant_operator")

TenantStatus = Literal["draft", "onboarding", "sandbox", "live", "suspended", "offboarding"]
TENANT_STATUSES: tuple[TenantStatus, ...] = get_args(TenantStatus)

IssueSeverity = Literal["critical", "high", "medium", "low"]
ISSUE_SEVERITIES: tuple[IssueSeverity, ...] = get_args(IssueSeverity)

IssueCategory = Literal[
    "agent_behaviour", "integration", "performance", "access", "billing", "other"
]
ISSUE_CATEGORIES: tuple[IssueCategory, ...] = get_args(IssueCategory)

IssueStatus = Literal["open", "in_progress", "waiting_on_tenant", "resolved"]
ISSUE_STATUSES: tuple[IssueStatus, ...] = get_args(IssueStatus)

MetricsSource = Literal["seed", "tracing"]


def sql_in(values: tuple[str, ...]) -> str:
    """Render a tuple as an SQL IN list for CHECK constraints: ('a', 'b')."""
    return "(" + ", ".join(f"'{v}'" for v in values) + ")"
