import type { SupportIssue } from "./types";

// Fake support issues raised by tenants for the CLAR AI platform team.
//
// This array lives in the server's memory. New issues from the form are pushed
// into it, so they show up until the server restarts. In Milestone 2 this
// becomes a database table.
export const mockSupportIssues: SupportIssue[] = [
  {
    id: "SUP-1041",
    tenantId: "hospital",
    tenantName: "Klinikum Demo",
    title: "Agent offered an appointment to a caller describing chest pain",
    description:
      "Caller described chest pain; the agent escalated correctly but first offered a cardiology appointment slot. Please check the emergency rule ordering.",
    category: "agent_behaviour",
    severity: "critical",
    status: "resolved",
    reporter: "Dr. Anna Weber",
    relatedTicketId: "C-1001",
    createdAt: "2026-10-28T21:44:00Z",
    updatedAt: "2026-10-29T08:10:00Z",
  },
  {
    id: "SUP-1043",
    tenantId: "hospital",
    tenantName: "Klinikum Demo",
    title: "Doctor's letters stuck in 'Needs approval' after HIS sync",
    description:
      "Since the HIS connector update, approved letter releases stay in 'Needs approval' for about 20 minutes before they move on.",
    category: "integration",
    severity: "high",
    status: "in_progress",
    reporter: "Jonas Keller",
    relatedTicketId: "C-1002",
    createdAt: "2026-11-04T09:35:00Z",
    updatedAt: "2026-11-04T13:02:00Z",
  },
  {
    id: "SUP-1044",
    tenantId: "hospital",
    tenantName: "Klinikum Demo",
    title: "Dashboard API latency spikes around 08:00",
    description:
      "p95 latency on the dashboard climbs above 1 s every morning between 08:00 and 08:30.",
    category: "performance",
    severity: "medium",
    status: "waiting_on_tenant",
    reporter: "Dr. Anna Weber",
    relatedTicketId: null,
    createdAt: "2026-11-04T10:12:00Z",
    updatedAt: "2026-11-04T15:40:00Z",
  },
  {
    id: "SUP-1045",
    tenantId: "hospital",
    tenantName: "Klinikum Demo",
    title: "Add Turkish to the voice agent's languages",
    description: "Many callers at the Erlangen site prefer Turkish. Is this on the roadmap?",
    category: "other",
    severity: "low",
    status: "open",
    reporter: "Mehmet Arslan",
    relatedTicketId: null,
    createdAt: "2026-11-05T07:50:00Z",
    updatedAt: "2026-11-05T07:50:00Z",
  },
  // Another tenant's issue: the PLATFORM queue shows it, the hospital's support page must not.
  {
    id: "SUP-1042",
    tenantId: "brenner",
    tenantName: "Brenner Holzbau",
    title: "Odoo connector times out on large return orders",
    description: "Returns with more than 40 lines fail with a timeout when the agent creates them.",
    category: "integration",
    severity: "high",
    status: "open",
    reporter: "Petra Müller",
    relatedTicketId: "C-2001",
    createdAt: "2026-11-03T14:20:00Z",
    updatedAt: "2026-11-03T14:20:00Z",
  },
];
