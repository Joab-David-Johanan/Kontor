import type { SecuritySettings } from "./types";

// Fake security settings. One entry per tenant; api.ts returns only the
// current tenant's entry. The brenner entry is another leak test.

export const mockSecuritySettings: SecuritySettings[] = [
  {
    tenantId: "hospital",
    mfaRequired: true,
    ssoProvider: "Microsoft Entra ID",
    sessionTimeoutMin: 30,
    ipAllowlist: ["10.20.0.0/16", "192.168.40.0/24"],
    dataRegion: "EU (Frankfurt)",
    retentionDays: 365,
    piiRedaction: true,
    users: [
      {
        name: "Dr. Anna Weber",
        email: "a.weber@klinikum-demo.de",
        role: "tenant_admin",
        mfaEnabled: true,
        lastLoginAt: "2026-11-05T07:12:00Z",
      },
      {
        name: "Jonas Keller",
        email: "j.keller@klinikum-demo.de",
        role: "tenant_operator",
        mfaEnabled: true,
        lastLoginAt: "2026-11-05T06:58:00Z",
      },
      {
        name: "Mehmet Arslan",
        email: "m.arslan@klinikum-demo.de",
        role: "tenant_operator",
        mfaEnabled: false,
        lastLoginAt: "2026-11-03T15:40:00Z",
      },
    ],
    apiKeys: [
      {
        id: "key-01",
        label: "Hospital information system (HIS) connector",
        lastFour: "9f3a",
        createdAt: "2026-09-12T09:00:00Z",
        lastUsedAt: "2026-11-05T07:30:00Z",
      },
      {
        id: "key-02",
        label: "Reporting export (unused)",
        lastFour: "c71e",
        createdAt: "2026-10-01T09:00:00Z",
        lastUsedAt: null,
      },
    ],
    auditLog: [
      { at: "2026-11-05T07:12:00Z", actor: "Dr. Anna Weber", action: "Signed in with SSO" },
      { at: "2026-11-04T16:05:00Z", actor: "Dr. Anna Weber", action: "Changed session timeout from 60 to 30 minutes" },
      { at: "2026-11-04T09:20:00Z", actor: "Jonas Keller", action: "Approved release of doctor's letter (C-1002)" },
      { at: "2026-11-03T15:40:00Z", actor: "Mehmet Arslan", action: "Signed in without MFA" },
    ],
  },
  // LEAK TEST: must never appear on the hospital's security page.
  {
    tenantId: "brenner",
    mfaRequired: false,
    ssoProvider: null,
    sessionTimeoutMin: 120,
    ipAllowlist: [],
    dataRegion: "EU (Frankfurt)",
    retentionDays: 730,
    piiRedaction: false,
    users: [
      {
        name: "Petra Müller",
        email: "p.mueller@brenner-demo.de",
        role: "tenant_admin",
        mfaEnabled: false,
        lastLoginAt: "2026-11-04T08:00:00Z",
      },
    ],
    apiKeys: [],
    auditLog: [],
  },
];
