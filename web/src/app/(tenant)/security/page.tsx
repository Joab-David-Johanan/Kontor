import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMe, getSecurity } from "@/lib/api";
import { dateFmt, dateTimeFmt } from "@/lib/format";
import type { StaffRole } from "@/lib/types";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Security" };

const roleLabels: Record<StaffRole, string> = {
  tenant_admin: "Admin",
  tenant_operator: "Operator",
  platform_staff: "Platform staff",
};

// The page itself renders instantly; its live data streams in inside <Suspense>.
// The boundary must sit INSIDE the page: on a client navigation (e.g. Dashboard →
// Support) only the part below the shared layout re-renders, so a loading.tsx at
// the layout level could not show its skeleton.
export default function SecurityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SecurityContent />
    </Suspense>
  );
}

// app/(tenant)/security/page.tsx → "/security"
async function SecurityContent() {
  const me = await getMe();
  if (me.role !== "tenant_admin") return <AdminsOnly tenantName={me.tenant.name} />;
  const s = await getSecurity();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader
        eyebrow={me.tenant.name}
        title="Security"
        description="How your staff sign in, who has access, and what happened recently."
      />

      <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Read-only for now. Sign-in rules are enforced by the identity provider (Keycloak).
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Sign-in">
          <Setting label="Multi-factor authentication (MFA)">
            <OnOff on={s.mfaRequired} onText="Required" offText="Optional" />
          </Setting>
          <Setting label="Single sign-on (SSO)">{s.ssoProvider ?? "Not configured"}</Setting>
          <Setting label="Session timeout">{s.sessionTimeoutMin} minutes</Setting>
          <Setting label="IP allowlist">
            {s.ipAllowlist.length === 0 ? (
              "Any address"
            ) : (
              <span className="flex flex-wrap justify-end gap-1">
                {s.ipAllowlist.map((ip) => (
                  <code key={ip} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                    {ip}
                  </code>
                ))}
              </span>
            )}
          </Setting>
        </Card>

        <Card title="Data protection">
          <Setting label="Data region">{s.dataRegion}</Setting>
          <Setting label="Conversation retention">{s.retentionDays} days</Setting>
          <Setting label="Personal data redaction">
            <OnOff on={s.piiRedaction} onText="On" offText="Off" />
          </Setting>
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`Staff accounts (${s.users.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">MFA</th>
                  <th className="py-2">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.users.map((u) => (
                  <tr key={u.email}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{roleLabels[u.role]}</td>
                    <td className="py-3 pr-4">
                      <OnOff on={u.mfaEnabled} onText="Enabled" offText="Missing" />
                    </td>
                    <td className="py-3 tabular-nums text-slate-700">
                      {u.lastLoginAt ? dateTimeFmt.format(new Date(u.lastLoginAt)) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="API keys">
          {s.apiKeys.length === 0 ? (
            <p className="text-sm text-slate-500">No API keys.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {s.apiKeys.map((k) => (
                <li key={k.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{k.label}</span>
                    <code className="text-xs text-slate-500">••••{k.lastFour}</code>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Created {dateFmt.format(new Date(k.createdAt))} ·{" "}
                    {k.lastUsedAt ? (
                      `last used ${dateTimeFmt.format(new Date(k.lastUsedAt))}`
                    ) : (
                      <span className="font-medium text-amber-700">never used, consider revoking</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Audit log">
          <ol className="divide-y divide-slate-100">
            {s.auditLog.map((e) => (
              <li key={`${e.at}-${e.action}`} className="py-3 text-sm">
                <div className="text-slate-900">{e.action}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {e.actor} · {dateTimeFmt.format(new Date(e.at))}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </main>
  );
}

// Layout helpers used only on this page.
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-900">{children}</span>
    </div>
  );
}

// A read-only on/off pill: shows a word, not just a colour.
function OnOff({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        on
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-amber-50 text-amber-800 ring-amber-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden />
      {on ? onText : offText}
    </span>
  );
}

// Operators reach this page only by typing the URL (the menu hides it for them).
// The API would refuse them anyway (403); this explains it politely.
function AdminsOnly({ tenantName }: { tenantName: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader eyebrow={tenantName} title="Security" />
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        Only admins can view security settings. Ask an admin of your organisation if you need a
        change.
      </p>
    </main>
  );
}
