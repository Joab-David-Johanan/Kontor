"""Load demo data (the former frontend mocks) into the database.

    uv run python -m core.seed            # only if the database is empty
    uv run python -m core.seed --reset    # wipe all data first (dev/test only)

Includes a second tenant ("brenner") on purpose: tests and manual checks prove
that the hospital never sees its data, and vice versa.
"""

import asyncio
import sys
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.db import get_sessionmaker
from core.models import (
    ApiKey,
    AuditEvent,
    Base,
    Conversation,
    SecuritySettings,
    SupportIssue,
    Tenant,
    UsageSnapshot,
    User,
)

# No passwords here: accounts and passwords live at the identity provider (Keycloak).
# Each user is linked to their Keycloak identity on first sign-in (verified e-mail).


def ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


TENANTS = [
    {"id": "hospital", "name": "Klinikum Demo", "plugin_id": "hospital"},
    {"id": "brenner", "name": "Brenner Holzbau", "plugin_id": "sales"},
]

USERS: list[dict[str, Any]] = [
    {
        "tenant_id": "hospital",
        "name": "Dr. Anna Weber",
        "email": "a.weber@klinikum-demo.de",
        "role": "tenant_admin",
        "mfa_enabled": True,
        "last_login_at": ts("2026-11-05T07:12:00Z"),
    },
    {
        "tenant_id": "hospital",
        "name": "Jonas Keller",
        "email": "j.keller@klinikum-demo.de",
        "role": "tenant_operator",
        "mfa_enabled": True,
        "last_login_at": ts("2026-11-05T06:58:00Z"),
    },
    {
        "tenant_id": "hospital",
        "name": "Mehmet Arslan",
        "email": "m.arslan@klinikum-demo.de",
        "role": "tenant_operator",
        "mfa_enabled": False,
        "last_login_at": ts("2026-11-03T15:40:00Z"),
    },
    {
        "tenant_id": "brenner",
        "name": "Petra Müller",
        "email": "p.mueller@brenner-demo.de",
        "role": "tenant_admin",
        "mfa_enabled": False,
        "last_login_at": ts("2026-11-04T08:00:00Z"),
    },
    {
        "tenant_id": None,
        "name": "Lena Hoffmann",
        "email": "l.hoffmann@kontor.dev",
        "role": "platform_staff",
        "mfa_enabled": True,
        "last_login_at": ts("2026-11-05T08:30:00Z"),
    },
]

CONVERSATIONS: list[dict[str, Any]] = [
    {
        "ref": "C-1001",
        "tenant_id": "hospital",
        "channel": "voice",
        "contact_name": "Unbekannt",
        "contact": "+49 9131 85-…",
        "summary": "Brustschmerzen, an Notaufnahme weitergeleitet",
        "status": "escalated",
        "flags": ["emergency"],
        "started_at": ts("2026-11-03T21:30:00Z"),
    },
    {
        "ref": "C-1002",
        "tenant_id": "hospital",
        "channel": "outlook",
        "contact_name": "Herr Becker",
        "contact": "h.becker@web.de",
        "summary": "Arztbrief angefordert, Identität muss geprüft werden",
        "status": "waiting_approval",
        "flags": [],
        "started_at": ts("2026-11-04T07:45:00Z"),
    },
    {
        "ref": "C-1003",
        "tenant_id": "hospital",
        "channel": "whatsapp",
        "contact_name": "Frau Schmidt",
        "contact": "+49 171 …",
        "summary": "Termin in der Gefäßchirurgie verschieben",
        "status": "active",
        "flags": [],
        "started_at": ts("2026-11-04T09:10:00Z"),
    },
    {
        "ref": "C-1004",
        "tenant_id": "hospital",
        "channel": "web",
        "contact_name": "Anonym",
        "contact": None,
        "summary": "Frage nach Besuchszeiten",
        "status": "resolved",
        "flags": [],
        "started_at": ts("2026-11-04T10:02:00Z"),
    },
    {
        "ref": "C-1005",
        "tenant_id": "hospital",
        "channel": "voice",
        "contact_name": "Herr Yilmaz",
        "contact": "+49 89 …",
        "summary": "Anfahrt und Parken am Klinikum",
        "status": "resolved",
        "flags": [],
        "started_at": ts("2026-11-04T10:40:00Z"),
    },
    # LEAK TEST: another tenant's ticket. Must never appear for the hospital.
    {
        "ref": "C-2001",
        "tenant_id": "brenner",
        "channel": "voice",
        "contact_name": "Schreinerei Müller",
        "contact": None,
        "summary": "Retoure über 1.200 EUR angefragt",
        "status": "waiting_approval",
        "flags": [],
        "started_at": ts("2026-11-04T08:12:00Z"),
    },
]

SECURITY: list[dict[str, Any]] = [
    {
        "tenant_id": "hospital",
        "mfa_required": True,
        "sso_provider": "Microsoft Entra ID",
        "session_timeout_min": 30,
        "ip_allowlist": ["10.20.0.0/16", "192.168.40.0/24"],
        "data_region": "EU (Frankfurt)",
        "retention_days": 365,
        "pii_redaction": True,
    },
    {
        "tenant_id": "brenner",
        "mfa_required": False,
        "sso_provider": None,
        "session_timeout_min": 120,
        "ip_allowlist": [],
        "data_region": "EU (Frankfurt)",
        "retention_days": 730,
        "pii_redaction": False,
    },
]

API_KEYS: list[dict[str, Any]] = [
    {
        "tenant_id": "hospital",
        "label": "Hospital information system (HIS) connector",
        "last_four": "9f3a",
        "created_at": ts("2026-09-12T09:00:00Z"),
        "last_used_at": ts("2026-11-05T07:30:00Z"),
    },
    {
        "tenant_id": "hospital",
        "label": "Reporting export (unused)",
        "last_four": "c71e",
        "created_at": ts("2026-10-01T09:00:00Z"),
        "last_used_at": None,
    },
]

AUDIT: list[dict[str, Any]] = [
    {
        "tenant_id": "hospital",
        "at": ts("2026-11-05T07:12:00Z"),
        "actor": "Dr. Anna Weber",
        "action": "Signed in with SSO",
    },
    {
        "tenant_id": "hospital",
        "at": ts("2026-11-04T16:05:00Z"),
        "actor": "Dr. Anna Weber",
        "action": "Changed session timeout from 60 to 30 minutes",
    },
    {
        "tenant_id": "hospital",
        "at": ts("2026-11-04T09:20:00Z"),
        "actor": "Jonas Keller",
        "action": "Approved release of doctor's letter (C-1002)",
    },
    {
        "tenant_id": "hospital",
        "at": ts("2026-11-03T15:40:00Z"),
        "actor": "Mehmet Arslan",
        "action": "Signed in without MFA",
    },
]

USAGE: list[dict[str, Any]] = [
    {
        "tenant_id": "hospital",
        "captured_at": ts("2026-11-05T00:00:00Z"),
        "requests_24h": 18_420,
        "error_rate_pct": 0.21,
        "p95_latency_ms": 184,
        "uptime_pct": 99.97,
        "requests_per_hour": [
            210,
            160,
            120,
            95,
            90,
            130,
            380,
            920,
            1340,
            1460,
            1390,
            1280,
            1190,
            1240,
            1310,
            1180,
            1050,
            880,
            640,
            520,
            430,
            360,
            290,
            250,
        ],
        "active_staff": 14,
        "documents_indexed": 1_283,
        "automation_rate_pct": 62,
        "avg_first_response_sec": 4.2,
    },
    {
        "tenant_id": "brenner",
        "captured_at": ts("2026-11-05T00:00:00Z"),
        "requests_24h": 6_310,
        "error_rate_pct": 0.48,
        "p95_latency_ms": 231,
        "uptime_pct": 99.9,
        "requests_per_hour": [
            20,
            15,
            10,
            10,
            12,
            40,
            160,
            420,
            610,
            650,
            600,
            540,
            410,
            520,
            580,
            560,
            470,
            300,
            140,
            80,
            60,
            40,
            30,
            25,
        ],
        "active_staff": 5,
        "documents_indexed": 312,
        "automation_rate_pct": 48,
        "avg_first_response_sec": 6.8,
    },
]

SUPPORT: list[dict[str, Any]] = [
    {
        "ref": "SUP-1041",
        "tenant_id": "hospital",
        "reporter": "a.weber@klinikum-demo.de",
        "title": "Agent offered an appointment to a caller describing chest pain",
        "description": "Caller described chest pain; the agent escalated correctly but first "
        "offered a cardiology appointment slot. Please check the emergency rule "
        "ordering.",
        "category": "agent_behaviour",
        "severity": "critical",
        "status": "resolved",
        "related": "C-1001",
        "created_at": ts("2026-10-28T21:44:00Z"),
        "updated_at": ts("2026-10-29T08:10:00Z"),
    },
    {
        "ref": "SUP-1043",
        "tenant_id": "hospital",
        "reporter": "j.keller@klinikum-demo.de",
        "title": "Doctor's letters stuck in 'Needs approval' after HIS sync",
        "description": "Since the HIS connector update, approved letter releases stay in 'Needs "
        "approval' for about 20 minutes before they move on.",
        "category": "integration",
        "severity": "high",
        "status": "in_progress",
        "related": "C-1002",
        "created_at": ts("2026-11-04T09:35:00Z"),
        "updated_at": ts("2026-11-04T13:02:00Z"),
    },
    {
        "ref": "SUP-1044",
        "tenant_id": "hospital",
        "reporter": "a.weber@klinikum-demo.de",
        "title": "Dashboard API latency spikes around 08:00",
        "description": "p95 latency on the dashboard climbs above 1 s every morning between "
        "08:00 and 08:30.",
        "category": "performance",
        "severity": "medium",
        "status": "waiting_on_tenant",
        "related": None,
        "created_at": ts("2026-11-04T10:12:00Z"),
        "updated_at": ts("2026-11-04T15:40:00Z"),
    },
    {
        "ref": "SUP-1045",
        "tenant_id": "hospital",
        "reporter": "m.arslan@klinikum-demo.de",
        "title": "Add Turkish to the voice agent's languages",
        "description": "Many callers at the Erlangen site prefer Turkish. Is this on the roadmap?",
        "category": "other",
        "severity": "low",
        "status": "open",
        "related": None,
        "created_at": ts("2026-11-05T07:50:00Z"),
        "updated_at": ts("2026-11-05T07:50:00Z"),
    },
    # Another tenant's issue: the platform queue shows it, the hospital must not.
    {
        "ref": "SUP-1042",
        "tenant_id": "brenner",
        "reporter": "p.mueller@brenner-demo.de",
        "title": "Odoo connector times out on large return orders",
        "description": "Returns with more than 40 lines fail with a timeout when the agent "
        "creates them.",
        "category": "integration",
        "severity": "high",
        "status": "open",
        "related": "C-2001",
        "created_at": ts("2026-11-03T14:20:00Z"),
        "updated_at": ts("2026-11-03T14:20:00Z"),
    },
]


async def wipe(session: AsyncSession) -> None:
    tables = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
    await session.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


async def seed(session: AsyncSession) -> None:
    session.add_all(Tenant(**t) for t in TENANTS)
    await session.flush()

    users = {u["email"]: User(**u) for u in USERS}
    session.add_all(users.values())

    conversations = {c["ref"]: Conversation(**c) for c in CONVERSATIONS}
    session.add_all(conversations.values())
    session.add_all(SecuritySettings(**s) for s in SECURITY)
    session.add_all(ApiKey(**k) for k in API_KEYS)
    session.add_all(AuditEvent(**a) for a in AUDIT)
    session.add_all(UsageSnapshot(**u) for u in USAGE)
    await session.flush()  # users and conversations now have ids

    for item in SUPPORT:
        data = dict(item)
        reporter = users[data.pop("reporter")]
        related = data.pop("related")
        session.add(
            SupportIssue(
                **data,
                reporter_id=reporter.id,
                related_conversation_id=conversations[related].id if related else None,
            )
        )

    # Continue the code sequences after the seeded codes (next: C-2002, SUP-1046).
    await session.execute(text("SELECT setval('conversation_ref_seq', 2001)"))
    await session.execute(text("SELECT setval('support_issue_ref_seq', 1045)"))
    await session.commit()


async def run(reset: bool) -> None:
    if get_settings().environment == "production":
        raise SystemExit("Refusing to seed demo data in production.")
    async with get_sessionmaker()() as session:
        if reset:
            await wipe(session)
            await session.commit()
        existing = await session.scalar(select(func.count()).select_from(Tenant))
        if existing:
            print(f"Database already has {existing} tenants; nothing to do (use --reset).")
            return
        await seed(session)
        print(f"Seeded demo data at {datetime.now(UTC):%Y-%m-%d %H:%M} UTC.")


if __name__ == "__main__":
    asyncio.run(run(reset="--reset" in sys.argv))
