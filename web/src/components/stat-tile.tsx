// One headline number with a label. Used on the dashboard.
// `marker` adds a small coloured dot next to the label (e.g. red for emergencies);
// the number itself always stays in normal text colour.
export function StatTile({
  label,
  value,
  hint,
  marker,
}: {
  label: string;
  value: string;
  hint?: string;
  marker?: "critical" | "warning" | "good";
}) {
  const dot = {
    critical: "bg-red-600",
    warning: "bg-amber-500",
    good: "bg-emerald-500",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 text-sm text-slate-500">
        {marker && <span className={`h-2 w-2 rounded-full ${dot[marker]}`} aria-hidden />}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
