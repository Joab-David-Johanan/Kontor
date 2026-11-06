import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import type { Metadata } from "next";
import { getConversations, getDashboard, getMe } from "@/lib/api";
import { ConversationTable } from "@/components/conversation-table";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Tickets" };

// The page itself renders instantly; its live data streams in inside <Suspense>.
// The boundary must sit INSIDE the page: on a client navigation (e.g. Dashboard →
// Support) only the part below the shared layout re-renders, so a loading.tsx at
// the layout level could not show its skeleton.
export default function ConversationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ConversationsContent />
    </Suspense>
  );
}

// app/(tenant)/conversations/page.tsx → "/conversations"
async function ConversationsContent() {
  // The header counters come from the API's dashboard numbers (calculated in SQL),
  // so they are correct even when the table only shows the first page of tickets.
  const [me, conversations, dashboard] = await Promise.all([
    getMe(),
    getConversations(),
    getDashboard(),
  ]);
  const openCount = dashboard.tickets.open;
  const emergencyCount = dashboard.tickets.flagCounts.emergency ?? 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader eyebrow={me.tenant.name} title="Conversations">
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="text-slate-500">Open</dt>
            <dd className="text-xl font-semibold tabular-nums text-slate-900">{openCount}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Emergencies</dt>
            <dd className="text-xl font-semibold tabular-nums text-red-600">{emergencyCount}</dd>
          </div>
        </dl>
      </PageHeader>

      <ConversationTable conversations={conversations} />
    </main>
  );
}
