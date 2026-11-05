"use client";

import { useState } from "react";
import type { Channel, Conversation, ConversationStatus } from "@/lib/types";
import { dateFmt, timeFmt } from "@/lib/format";
import { StatusBadge } from "./status-badge";

type Filter = ConversationStatus | "all";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "escalated", label: "Escalated" },
  { value: "waiting_approval", label: "Needs approval" },
  { value: "active", label: "Active" },
  { value: "resolved", label: "Resolved" },
];

const channelLabels: Record<Channel, string> = {
  voice: "Phone",
  whatsapp: "WhatsApp",
  outlook: "Outlook",
  web: "Web chat",
};


export function ConversationTable({ conversations }: { conversations: Conversation[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all" ? conversations : conversations.filter((c) => c.status === filter);

  const countFor = (f: Filter) =>
    f === "all" ? conversations.length : conversations.filter((c) => c.status === f).length;

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {filters.map((f) => {
          const selected = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.label}
              <span
                className={`rounded px-1.5 text-xs tabular-nums ${
                  selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {countFor(f.value)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ticket table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[130px]" />
            <col className="w-[120px]" />
            <col className="w-[210px]" />
            <col />
            <col className="w-[150px]" />
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Caller</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((c) => {
              const started = new Date(c.startedAt);
              return (
                <tr
                  key={c.id}
                  className={`align-top transition-colors ${
                    c.emergency
                      ? "bg-red-50/70 shadow-[inset_4px_0_0_0_var(--color-red-600)] hover:bg-red-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-4 py-4 font-mono text-xs font-medium text-slate-500">
                    #{c.id.toUpperCase()}
                  </td>
                  <td className="px-4 py-4 tabular-nums">
                    <div className="font-medium text-slate-900">{timeFmt.format(started)}</div>
                    <div className="text-xs text-slate-500">{dateFmt.format(started)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {channelLabels[c.channel]}
                    </span>
                  </td>
                  <td className="px-4 py-4" title={c.contact ? `${c.callerName} · ${c.contact}` : c.callerName}>
                    <div className="truncate font-medium text-slate-900">{c.callerName}</div>
                    {c.contact && <div className="truncate text-xs text-slate-500">{c.contact}</div>}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {c.emergency && (
                      <span className="mb-1 mr-2 inline-flex rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                        Notfall
                      </span>
                    )}
                    <span className="leading-6">{c.summary}</span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No tickets with this status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
