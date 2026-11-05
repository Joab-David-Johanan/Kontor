import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CURRENT_TENANT } from "@/lib/config";
import { getDashboardMetrics } from "@/lib/api";
import { decimalFmt, numberFmt } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { BarList } from "@/components/bar-list";
import { HourlyBars } from "@/components/hourly-bars";

// Tab title becomes "Dashboard · Kontor" (template from layout.tsx)
export const metadata: Metadata = { title: "Dashboard" };

// app/dashboard/page.tsx → "/dashboard"
export default async function DashboardPage() {
  const { tickets, api, tenant } = await getDashboardMetrics(CURRENT_TENANT.id);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader
        eyebrow={CURRENT_TENANT.name}
        title="Dashboard"
        description="Demo data. Ticket numbers are calculated from your conversations; API and usage numbers are placeholders until the backend measures them."
      />

      <Section title="Tickets">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Total tickets" value={numberFmt.format(tickets.total)} />
          <StatTile label="Open" value={numberFmt.format(tickets.open)} hint="Everything not resolved" />
          <StatTile label="Emergencies" value={numberFmt.format(tickets.emergencies)} marker="critical" />
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
      </Section>

      <Section title="Your organisation">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active staff" value={numberFmt.format(tenant.activeStaff)} />
          <StatTile label="Documents indexed" value={numberFmt.format(tenant.documentsIndexed)} hint="Searchable by the agent" />
          <StatTile label="Automation rate" value={`${tenant.automationRatePct} %`} hint="Solved without a human" />
          <StatTile label="Avg. first response" value={`${decimalFmt.format(tenant.avgFirstResponseSec)} s`} />
        </div>
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
