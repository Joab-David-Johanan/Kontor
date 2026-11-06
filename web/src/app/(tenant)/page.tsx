import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { PLATFORM_TEAM } from "@/lib/platform";
import { getDashboard, getMe, getSecurity, getSupportIssues } from "@/lib/api";
import { numberFmt } from "@/lib/format";
import { NavCard } from "@/components/nav-card";
import { ChartIcon, LifebuoyIcon, ShieldIcon, TicketIcon } from "@/components/icons";

// The page itself renders instantly; its live data streams in inside <Suspense>.
// The boundary must sit INSIDE the page: on a client navigation (e.g. Dashboard →
// Support) only the part below the shared layout re-renders, so a loading.tsx at
// the layout level could not show its skeleton.
export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

// The home page: app/(tenant)/page.tsx → "/"
//
// STAND-IN → plugin (README §8 row 11): all four cards are hard-coded. Target: the
// platform cards (Tickets, Dashboard, Security, Support) stay; domain cards are
// rendered by a generic ActionCard from the active plugin's plugin.yaml.
async function HomeContent() {
  // Load a small teaser for each card, in parallel. The API scopes every call to the
  // caller's tenant; the numbers are calculated by the API, not here.
  const me = await getMe();
  const isAdmin = me.role === "tenant_admin";
  const [dashboard, issues, security] = await Promise.all([
    getDashboard(),
    getSupportIssues(),
    // Security data is for admins only (the API refuses operators), so only admins load it.
    isAdmin ? getSecurity() : Promise.resolve(null),
  ]);

  const open = dashboard.tickets.open;
  const emergencies = dashboard.tickets.flagCounts.emergency ?? 0;
  const usersWithoutMfa = security?.users.filter((u) => !u.mfaEnabled).length ?? 0;
  const activeIssues = issues.filter((i) => i.status !== "resolved").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8">
      <section className="mb-10">
        <p className="text-sm font-medium text-slate-500">Welcome back, {me.name}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          {me.tenant.name}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Choose where to start: work open tickets, check how the platform is performing,
          {isAdmin && " review your security settings,"} or get help from the {PLATFORM_TEAM}.
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
          meta={
            dashboard.api
              ? `${numberFmt.format(dashboard.api.requests24h)} API requests in the last 24 h`
              : "No usage data yet"
          }
        />
        {isAdmin && (
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
        )}
        <NavCard
          href="/support"
          title="Support"
          description={`Report a problem with the platform to the ${PLATFORM_TEAM} and follow its progress.`}
          icon={<LifebuoyIcon className="h-6 w-6" />}
          meta={`${activeIssues} active ${activeIssues === 1 ? "issue" : "issues"} with the platform team`}
        />
      </div>
    </main>
  );
}
