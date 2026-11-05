import { numberFmt } from "@/lib/format";

export type BarItem = {
  label: string;
  value: number;
  barClass?: string; // Tailwind background class; defaults to one shared hue
};

// Horizontal bars for a short breakdown (status, channel).
// Labels and numbers are written out, so the colour is never the only cue.
export function BarList({ items, unit }: { items: BarItem[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="group">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-700">{item.label}</span>
            <span className="font-medium tabular-nums text-slate-900">
              {numberFmt.format(item.value)}
            </span>
          </div>
          <div
            className="h-2 rounded-full bg-slate-100"
            title={`${item.label}: ${numberFmt.format(item.value)} ${unit}`}
          >
            <div
              className={`h-2 rounded-full transition-opacity group-hover:opacity-80 ${
                item.barClass ?? "bg-blue-600"
              }`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
