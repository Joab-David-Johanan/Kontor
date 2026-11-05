import type { Metadata } from "next";
import { getAllSupportIssues } from "@/lib/api";
import { ISSUE_SEVERITIES, type SupportIssue } from "@/lib/types";
import { dateTimeFmt } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import {
  CategoryLabel,
  IssueStatusBadge,
  SeverityBadge,
  severityMeta,
} from "@/components/support-badges";

export const metadata: Metadata = { title: "Support queue" };

// app/platform/support/page.tsx → "/platform/support"
// The CLAR AI platform team's queue: issues from EVERY tenant, most severe first.
export default async function PlatformSupportPage() {
  const issues = await getAllSupportIssues();
  const queue = issues.filter((i) => i.status !== "resolved");
  const resolved = issues.filter((i) => i.status === "resolved");
  const tenantCount = new Set(queue.map((i) => i.tenantId)).size;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader
        eyebrow="CLAR AI platform team"
        title="Support queue"
        description={`${queue.length} open ${queue.length === 1 ? "issue" : "issues"} from ${tenantCount} ${tenantCount === 1 ? "tenant" : "tenants"}, most severe first, then longest waiting.`}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ISSUE_SEVERITIES.map((s) => (
          <StatTile
            key={s}
            label={severityMeta[s].label}
            value={String(queue.filter((i) => i.severity === s).length)}
            hint={severityMeta[s].response}
            marker={s === "critical" ? "critical" : s === "high" || s === "medium" ? "warning" : undefined}
          />
        ))}
      </div>

      <IssueTable issues={queue} emptyText="Queue is empty." />

      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
          Resolved ({resolved.length})
        </summary>
        <div className="mt-4">
          <IssueTable issues={resolved} emptyText="Nothing resolved yet." />
        </div>
      </details>
    </main>
  );
}

function IssueTable({
  issues,
  emptyText,
}: {
  issues: SupportIssue[];
  emptyText: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[110px]" />
          <col className="w-[170px]" />
          <col className="w-[120px]" />
          <col />
          <col className="w-[150px]" />
          <col className="w-[140px]" />
        </colgroup>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Issue</th>
            <th className="px-4 py-3">Tenant</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {issues.map((i) => (
            <tr
              key={i.id}
              className={`align-top transition-colors hover:bg-slate-50 ${
                i.severity === "critical" && i.status !== "resolved"
                  ? "bg-red-50/70 shadow-[inset_4px_0_0_0_var(--color-red-600)]"
                  : ""
              }`}
            >
              <td className="px-4 py-4 font-mono text-xs font-medium text-slate-500">{i.id}</td>
              <td className="px-4 py-4">
                <div className="font-medium text-slate-900">{i.tenantName}</div>
                <div className="text-xs text-slate-500">{i.reporter}</div>
              </td>
              <td className="px-4 py-4">
                <SeverityBadge severity={i.severity} />
              </td>
              <td className="px-4 py-4">
                <div className="font-medium text-slate-900">{i.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <CategoryLabel category={i.category} />
                  {i.relatedTicketId && <span className="font-mono">{i.relatedTicketId}</span>}
                </div>
              </td>
              <td className="px-4 py-4">
                <IssueStatusBadge status={i.status} />
              </td>
              <td className="px-4 py-4 tabular-nums text-slate-700">
                {dateTimeFmt.format(new Date(i.createdAt))}
              </td>
            </tr>
          ))}
          {issues.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
