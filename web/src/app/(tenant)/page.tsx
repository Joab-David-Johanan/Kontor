import { CURRENT_TENANT } from "@/lib/config";
import {
  getConversations,
  getDashboardMetrics,
  getSecuritySettings,
  getSupportIssues,
} from "@/lib/api";
import { numberFmt } from "@/lib/format";
import { NavCard } from "@/components/nav-card";
import { ChartIcon, LifebuoyIcon, ShieldIcon, TicketIcon } from "@/components/icons";

// The home page: app/page.tsx → "/"
export default async function HomePage() {
  // Load a small teaser for each card. All three calls are tenant-filtered in api.ts.
  const [conversations, metrics, security, issues] = await Promise.all([
    getConversations(CURRENT_TENANT.id),
    getDashboardMetrics(CURRENT_TENANT.id),
    getSecuritySettings(CURRENT_TENANT.id),
    getSupportIssues(CURRENT_TENANT.id),
  ]);

  const open = conversations.filter((c) => c.status !== "resolved").length;
  const emergencies = conversations.filter((c) => c.emergency).length;
  const usersWithoutMfa = security.users.filter((u) => !u.mfaEnabled).length;
  const activeIssues = issues.filter((i) => i.status !== "resolved").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8">
      <section className="mb-10">
        <p className="text-sm font-medium text-slate-500">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          {CURRENT_TENANT.name}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Choose where to start: work open tickets, check how the platform is performing,
          review your security settings, or get help from the CLAR AI team.
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <NavCard
          href="/conversations"
          title="Ticket system"
          description="Every conversation the agent is handling, with emergencies and approvals flagged."
          icon={<TicketIcon className="h-6 w-6" />}
          meta={`${open} open · ${emergencies} ${emergencies === 1 ? "emergency" : "emergencies"}`}
        />
        <NavCard
          href="/dashboard"
          title="Dashboard"
          description="Ticket volumes, API health and your organisation's usage at a glance."
          icon={<ChartIcon className="h-6 w-6" />}
          meta={`${numberFmt.format(metrics.api.requests24h)} API requests in the last 24 h`}
        />
        <NavCard
          href="/security"
          title="Security"
          description="Sign-in rules, staff accounts, API keys and the audit log."
          icon={<ShieldIcon className="h-6 w-6" />}
          meta={
            usersWithoutMfa === 0
              ? "All staff use MFA"
              : `${usersWithoutMfa} staff ${usersWithoutMfa === 1 ? "account" : "accounts"} without MFA`
          }
        />
        <NavCard
          href="/support"
          title="Support"
          description="Report a problem with the platform to the CLAR AI team and follow its progress."
          icon={<LifebuoyIcon className="h-6 w-6" />}
          meta={`${activeIssues} active ${activeIssues === 1 ? "issue" : "issues"} with CLAR AI`}
        />
      </div>
    </main>
  );
}
