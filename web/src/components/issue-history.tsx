"use client";

// The tenant's previous issues, with filter tabs. A client component because the
// tabs react to clicks (same pattern as the ticket table's status tabs).

import { useState } from "react";
import type { SupportIssue } from "@/lib/types";
import { dateTimeFmt } from "@/lib/format";
import { CategoryLabel, IssueStatusBadge, SeverityBadge } from "./support-badges";

type Tab = "all" | "active" | "resolved";

const tabs: { value: Tab; label: string; test: (i: SupportIssue) => boolean }[] = [
  { value: "all", label: "All", test: () => true },
  { value: "active", label: "Active", test: (i) => i.status !== "resolved" },
  { value: "resolved", label: "Resolved", test: (i) => i.status === "resolved" },
];

export function IssueHistory({ issues }: { issues: SupportIssue[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const current = tabs.find((t) => t.value === tab) ?? tabs[0];
  const visible = issues.filter(current.test);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter issues">
        {tabs.map((t) => {
          const selected = t.value === tab;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.value)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span
                className={`rounded px-1.5 text-xs tabular-nums ${
                  selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {issues.filter(t.test).length}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          No issues here.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((i) => (
            <li
              key={i.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-medium text-slate-500">{i.id}</span>
                <SeverityBadge severity={i.severity} />
                <IssueStatusBadge status={i.status} />
                <CategoryLabel category={i.category} />
              </div>
              <p className="mt-2 font-medium text-slate-900">{i.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{i.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                {i.reporter} · opened {dateTimeFmt.format(new Date(i.createdAt))}
                {i.relatedTicketId && <> · ticket {i.relatedTicketId}</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
