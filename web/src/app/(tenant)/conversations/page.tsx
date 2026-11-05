import type { Metadata } from "next";
import { getConversations } from "@/lib/api";
import { CURRENT_TENANT } from "@/lib/config";
import { ConversationTable } from "@/components/conversation-table";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Tickets" };

// app/conversations/page.tsx → "/conversations"
export default async function ConversationsPage() {
  const conversations = await getConversations(CURRENT_TENANT.id);
  const openCount = conversations.filter((c) => c.status !== "resolved").length;
  const emergencyCount = conversations.filter((c) => c.emergency).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader eyebrow={CURRENT_TENANT.name} title="Conversations">
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
