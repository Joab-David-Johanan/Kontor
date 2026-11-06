import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDashboard, getMe } from "@/lib/api";
import { decimalFmt, numberFmt } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { BarList } from "@/components/bar-list";
import { HourlyBars } from "@/components/hourly-bars";

// Tab title becomes "Dashboard · Kontor" (template from layout.tsx)
export const metadata: Metadata = { title: "Dashboard" };

// The page itself renders instantly; its live data streams in inside <Suspense>.
// The boundary must sit INSIDE the page: on a client navigation (e.g. Dashboard →
// Support) only the part below the shared layout re-renders, so a loading.tsx at
// the layout level could not show its skeleton.
export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

// app/(tenant)/dashboard/page.tsx → "/dashboard"
async function DashboardContent() {
  const [me, { tickets, api, usage }] = await Promise.all([getMe(), getDashboard()]);
  const emergencies = tickets.flagCounts.emergency ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader
        eyebrow={me.tenant.name}
        title="Dashboard"
        description={
          api?.source === "seed"
            ? "Ticket numbers are calculated live by the API. API and usage numbers are demo values until tracing measures them."
            : "Ticket numbers are calculated live by the API."
        }
      />

      <Section title="Tickets">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Total tickets" value={numberFmt.format(tickets.total)} />
          <StatTile label="Open" value={numberFmt.format(tickets.open)} hint="Everything not resolved" />
          <StatTile label="Emergencies" value={numberFmt.format(emergencies)} marker="critical" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel title="By status">
            {/* status colours match the status badges in the ticket table */}
            <BarList
              unit="tickets"
              items={[
                { label: "Escalated", value: tickets.byStatus.escalated, barClass: "bg-red-600" },
                { label: "Needs approval", value: tickets.byStatus.waiting_approval, barClass: "bg-amber-500" },
                { label: "Active", value: tickets.byStatus.active, barClass: "bg-blue-500" },
                { label: "Resolved", value: tickets.byStatus.resolved, barClass: "bg-emerald-500" },
              ]}
            />
          </Panel>
          <Panel title="By channel">
            <BarList
              unit="tickets"
              items={[
                { label: "Phone", value: tickets.byChannel.voice },
                { label: "WhatsApp", value: tickets.byChannel.whatsapp },
                { label: "Outlook (Microsoft 365)", value: tickets.byChannel.outlook },
                { label: "Web chat", value: tickets.byChannel.web },
              ]}
            />
          </Panel>
        </div>
      </Section>

      <Section title="API">
        {!api ? (
          <EmptyPanel text="No API measurements yet." />
        ) : (
          <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Requests (24 h)" value={numberFmt.format(api.requests24h)} />
          <StatTile
            label="Error rate"
            value={`${decimalFmt.format(api.errorRatePct)} %`}
            marker={api.errorRatePct < 1 ? "good" : "warning"}
          />
          <StatTile label="p95 latency" value={`${numberFmt.format(api.p95LatencyMs)} ms`} hint="95% of requests were faster" />
          <StatTile label="Uptime (30 days)" value={`${decimalFmt.format(api.uptimePct)} %`} />
        </div>
        <div className="mt-4">
          <Panel title="Requests per hour (today)">
            <HourlyBars values={api.requestsPerHour} unit="requests" />
          </Panel>
        </div>
          </>
        )}
      </Section>

      <Section title="Your organisation">
        {!usage ? (
          <EmptyPanel text="No usage measurements yet." />
        ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active staff" value={numberFmt.format(usage.activeStaff)} />
          <StatTile label="Documents indexed" value={numberFmt.format(usage.documentsIndexed)} hint="Searchable by the agent" />
          <StatTile label="Automation rate" value={`${usage.automationRatePct} %`} hint="Solved without a human" />
          <StatTile label="Avg. first response" value={`${decimalFmt.format(usage.avgFirstResponseSec)} s`} />
        </div>
        )}
      </Section>
    </main>
  );
}

// Small layout helpers used only on this page, so they live in this file.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}
