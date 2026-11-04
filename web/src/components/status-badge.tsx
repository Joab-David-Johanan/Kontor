import type { ConversationStatus } from "@/lib/types";

const labels: Record<ConversationStatus, string> = {
  active: "Active",
  waiting_approval: "Needs approval",
  resolved: "Resolved",
  escalated: "Escalated",
};

// Badge background/text plus a matching status dot
const styles: Record<ConversationStatus, { badge: string; dot: string }> = {
  active: { badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  waiting_approval: { badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  resolved: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  escalated: { badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-600" },
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {labels[status]}
    </span>
  );
}
