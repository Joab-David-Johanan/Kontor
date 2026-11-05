import type {
  Channel,
  Conversation,
  ConversationStatus,
  DashboardMetrics,
  IssueSeverity,
  NewSupportIssue,
  SecuritySettings,
  SupportIssue,
} from "./types";
import { mockConversations } from "./mock-data";
import { mockApiMetrics, mockTenantMetrics } from "./mock-metrics";
import { mockSecuritySettings } from "./mock-security";
import { mockSupportIssues } from "./mock-support";

// The ONLY place the UI gets data from. Every function takes a tenantId and
// returns only that tenant's data. In Milestone 2 these move into FastAPI.

// Returns ONLY the given tenant's conversations.
export async function getConversations(tenantId: string): Promise<Conversation[]> {
  return mockConversations.filter((c) => c.tenantId === tenantId);
}

export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  // Ticket metrics are calculated from the tenant's own conversations,
  // so they can never count another tenant's tickets.
  const conversations = await getConversations(tenantId);

  const byStatus: Record<ConversationStatus, number> = {
    active: 0,
    waiting_approval: 0,
    escalated: 0,
    resolved: 0,
  };
  const byChannel: Record<Channel, number> = { voice: 0, whatsapp: 0, outlook: 0, web: 0 };

  for (const c of conversations) {
    byStatus[c.status] += 1;
    byChannel[c.channel] += 1;
  }

  const api = mockApiMetrics[tenantId];
  const tenant = mockTenantMetrics[tenantId];
  if (!api || !tenant) {
    throw new Error(`No metrics for tenant "${tenantId}"`);
  }

  return {
    tickets: {
      total: conversations.length,
      open: conversations.length - byStatus.resolved,
      emergencies: conversations.filter((c) => c.emergency).length,
      byStatus,
      byChannel,
    },
    api,
    tenant,
  };
}

export async function getSecuritySettings(tenantId: string): Promise<SecuritySettings> {
  const settings = mockSecuritySettings.find((s) => s.tenantId === tenantId);
  if (!settings) {
    throw new Error(`No security settings for tenant "${tenantId}"`);
  }
  return settings;
}

// ── Support ─────────────────────────────────────────────────

const newestFirst = (a: SupportIssue, b: SupportIssue) => b.createdAt.localeCompare(a.createdAt);

// Tenant portal: ONLY this tenant's issues, newest first.
export async function getSupportIssues(tenantId: string): Promise<SupportIssue[]> {
  return mockSupportIssues.filter((i) => i.tenantId === tenantId).sort(newestFirst);
}

const severityRank: Record<IssueSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

// Platform portal: EVERY tenant's issues, most severe first, then oldest first
// (the issue waiting longest gets handled first).
// ⚠️ From Milestone 3 this must check that the caller is platform staff.
export async function getAllSupportIssues(): Promise<SupportIssue[]> {
  return [...mockSupportIssues].sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

export async function createSupportIssue(
  tenant: { id: string; name: string },
  reporter: string,
  input: NewSupportIssue,
): Promise<SupportIssue> {
  // Next id: highest existing number + 1, e.g. SUP-1045 → SUP-1046
  const nextNumber = Math.max(1000, ...mockSupportIssues.map((i) => Number(i.id.slice(4)))) + 1;
  const now = new Date().toISOString();

  const issue: SupportIssue = {
    ...input,
    id: `SUP-${nextNumber}`,
    tenantId: tenant.id,
    tenantName: tenant.name,
    reporter,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  mockSupportIssues.push(issue);
  return issue;
}
