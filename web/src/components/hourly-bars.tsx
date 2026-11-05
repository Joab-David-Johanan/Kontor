import { numberFmt } from "@/lib/format";

// A 24-column chart (one bar per hour). Pure CSS: hovering a column shows
// a tooltip with the exact value. A table view is available underneath.
export function HourlyBars({ values, unit }: { values: number[]; unit: string }) {
  const max = Math.max(1, ...values);
  const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;

  return (
    <div>
      <div className="flex h-40 items-end gap-0.5 border-b border-slate-200">
        {values.map((v, h) => (
          <div key={h} className="group relative flex h-full flex-1 items-end">
            {/* the bar; the full-height wrapper is the (bigger) hover target */}
            <div
              className="w-full rounded-t bg-blue-600 transition-colors group-hover:bg-blue-800"
              style={{ height: `${(v / max) * 100}%` }}
            />
            {/* tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block">
              {hour(h)}–{String(h).padStart(2, "0")}:59 · {numberFmt.format(v)} {unit}
            </div>
          </div>
        ))}
      </div>

      {/* x-axis: a label every 6 hours */}
      <div className="mt-1 flex justify-between text-xs tabular-nums text-slate-500">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:59</span>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-900">
          Show as table
        </summary>
        <table className="mt-2 w-full max-w-xs text-left">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1">Hour</th>
              <th className="py-1 text-right">{unit}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {values.map((v, h) => (
              <tr key={h}>
                <td className="py-1">{hour(h)}</td>
                <td className="py-1 text-right">{numberFmt.format(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
