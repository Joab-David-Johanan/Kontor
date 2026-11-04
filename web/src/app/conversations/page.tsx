import { getConversations } from "@/lib/api";
import { CURRENT_TENANT } from "@/lib/config";
import { ConversationTable } from "@/components/conversation-table";

export default async function ConversationsPage() {
  const conversations = await getConversations(CURRENT_TENANT.id);
  const openCount = conversations.filter((c) => c.status !== "resolved").length;
  const emergencyCount = conversations.filter((c) => c.emergency).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-medium text-slate-500">{CURRENT_TENANT.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Conversations
          </h1>
        </div>
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
      </header>

      <ConversationTable conversations={conversations} />
    </main>
  );
}
