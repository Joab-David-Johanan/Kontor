import type { ApiMetrics, TenantMetrics } from "./types";

// Fake API and tenant metrics, keyed by tenant id.
// Ticket metrics are NOT stored here: api.ts calculates them from the conversations.
// Deleted once the backend measures real numbers (Milestone 13).

export const mockApiMetrics: Record<string, ApiMetrics> = {
  hospital: {
    requests24h: 18_420,
    errorRatePct: 0.21,
    p95LatencyMs: 184,
    uptimePct: 99.97,
    requestsPerHour: [
      210, 160, 120, 95, 90, 130, 380, 920, 1340, 1460, 1390, 1280,
      1190, 1240, 1310, 1180, 1050, 880, 640, 520, 430, 360, 290, 250,
    ],
  },
  brenner: {
    requests24h: 6_310,
    errorRatePct: 0.48,
    p95LatencyMs: 231,
    uptimePct: 99.9,
    requestsPerHour: [
      20, 15, 10, 10, 12, 40, 160, 420, 610, 650, 600, 540,
      410, 520, 580, 560, 470, 300, 140, 80, 60, 40, 30, 25,
    ],
  },
};

export const mockTenantMetrics: Record<string, TenantMetrics> = {
  hospital: {
    activeStaff: 14,
    documentsIndexed: 1_283,
    automationRatePct: 62,
    avgFirstResponseSec: 4.2,
  },
  brenner: {
    activeStaff: 5,
    documentsIndexed: 312,
    automationRatePct: 48,
    avgFirstResponseSec: 6.8,
  },
};
