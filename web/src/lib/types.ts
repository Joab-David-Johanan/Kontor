// "outlook" = emails arriving in the tenant's Microsoft 365 (Outlook/Exchange) mailbox,
// the standard business mailbox in German companies and hospitals. The SENDER can use
// any provider (web.de, GMX, T-Online, Gmail …); that shows up in `contact`.
export type Channel = "voice" | "whatsapp" | "outlook" | "web";

export type ConversationStatus =
  | "active"
  | "waiting_approval"
  | "resolved"
  | "escalated";

export interface Conversation {
  id: string;
  tenantId: string;
  channel: Channel;
  callerName: string;
  contact?: string; // optional: phone number or email address, e.g. "h.becker@web.de"
  summary: string;
  status: ConversationStatus;
  emergency: boolean;
  startedAt: string; // ISO 8601 string, exactly as the API will send it
}

// ── Dashboard ───────────────────────────────────────────────

export interface TicketMetrics {
  total: number;
  open: number;
  emergencies: number;
  byStatus: Record<ConversationStatus, number>;
  byChannel: Record<Channel, number>;
}

export interface ApiMetrics {
  requests24h: number;
  errorRatePct: number;
  p95LatencyMs: number;
  uptimePct: number;
  requestsPerHour: number[]; // 24 values, index 0 = 00:00–00:59
}

export interface TenantMetrics {
  activeStaff: number;
  documentsIndexed: number;
  automationRatePct: number; // share of tickets solved without a human
  avgFirstResponseSec: number;
}

export interface DashboardMetrics {
  tickets: TicketMetrics;
  api: ApiMetrics;
  tenant: TenantMetrics;
}

// ── Security ────────────────────────────────────────────────

export type StaffRole = "tenant_admin" | "tenant_operator";

export interface StaffUser {
  name: string;
  email: string;
  role: StaffRole;
  mfaEnabled: boolean;
  lastLoginAt: string; // ISO 8601
}

export interface ApiKey {
  id: string;
  label: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt: string | null; // null = never used
}

export interface AuditEvent {
  at: string;
  actor: string;
  action: string;
}

export interface SecuritySettings {
  tenantId: string;
  mfaRequired: boolean;
  ssoProvider: string | null; // null = no single sign-on configured
  sessionTimeoutMin: number;
  ipAllowlist: string[];
  dataRegion: string;
  retentionDays: number;
  piiRedaction: boolean;
  users: StaffUser[];
  apiKeys: ApiKey[];
  auditLog: AuditEvent[];
}
// ── Support (tenant → CLAR AI platform team) ────────────────

// These lists exist at RUNTIME too (the form and the server action loop over them
// and validate against them). The types are derived from the lists, so the two
// can never disagree. See basics.md §42.
export const ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_CATEGORIES = [
  "agent_behaviour",
  "integration",
  "performance",
  "access",
  "billing",
  "other",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export type IssueStatus = "open" | "in_progress" | "waiting_on_tenant" | "resolved";

export interface SupportIssue {
  id: string; // e.g. "SUP-1042"
  tenantId: string;
  tenantName: string; // shown to platform staff, who see every tenant's issues
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  reporter: string;
  relatedTicketId: string | null; // e.g. "C-1002", or null
  createdAt: string;
  updatedAt: string;
}

// What the form sends. The server adds id, tenant, reporter, status and dates.
export type NewSupportIssue = Pick<
  SupportIssue,
  "title" | "description" | "category" | "severity" | "relatedTicketId"
>;
