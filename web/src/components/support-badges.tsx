import type { IssueCategory, IssueSeverity, IssueStatus } from "@/lib/types";

// Labels, explanations and colours for support issues, in ONE place, so the form,
// the history and the platform queue always look and read the same.

export const severityMeta: Record<
  IssueSeverity,
  { label: string; description: string; response: string; badge: string; dot: string }
> = {
  critical: {
    label: "Critical",
    description: "The agent is down or unsafe, e.g. emergencies are not escalated.",
    response: "Response within 30 min, 24/7",
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-600",
  },
  high: {
    label: "High",
    description: "An important workflow is broken, with no workaround.",
    response: "Response within 4 h",
    badge: "bg-orange-50 text-orange-800 ring-orange-200",
    dot: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    description: "Something is wrong or slow, but there is a workaround.",
    response: "Response within 1 business day",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  low: {
    label: "Low",
    description: "A question, a cosmetic problem or a feature wish.",
    response: "Response within 3 business days",
    badge: "bg-slate-50 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
  },
};

export const issueStatusMeta: Record<IssueStatus, { label: string; badge: string }> = {
  open: { label: "Open", badge: "bg-blue-50 text-blue-700 ring-blue-200" },
  in_progress: { label: "In progress", badge: "bg-violet-50 text-violet-700 ring-violet-200" },
  waiting_on_tenant: { label: "Waiting for you", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  resolved: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export const categoryLabels: Record<IssueCategory, string> = {
  agent_behaviour: "Agent behaviour",
  integration: "Integration",
  performance: "Performance",
  access: "Access & logins",
  billing: "Billing",
  other: "Other",
};

const pill =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const m = severityMeta[severity];
  return (
    <span className={`${pill} ${m.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  );
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const m = issueStatusMeta[status];
  return <span className={`${pill} ${m.badge}`}>{m.label}</span>;
}

export function CategoryLabel({ category }: { category: IssueCategory }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
      {categoryLabels[category]}
    </span>
  );
}
