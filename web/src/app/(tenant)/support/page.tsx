import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import type { Metadata } from "next";
import { PLATFORM_NAME, PLATFORM_TEAM } from "@/lib/platform";
import { getMe, getSupportIssues } from "@/lib/api";
import { ISSUE_SEVERITIES } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { SupportForm } from "@/components/support-form";
import { IssueHistory } from "@/components/issue-history";
import { severityMeta } from "@/components/support-badges";
import { submitSupportIssue } from "./actions";

export const metadata: Metadata = { title: "Support" };

// The page itself renders instantly; its live data streams in inside <Suspense>.
// The boundary must sit INSIDE the page: on a client navigation (e.g. Dashboard →
// Support) only the part below the shared layout re-renders, so a loading.tsx at
// the layout level could not show its skeleton.
export default function SupportPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SupportContent />
    </Suspense>
  );
}

// app/(tenant)/support/page.tsx → "/support"
// A SERVER component: loads this tenant's issues, then hands the interactive parts
// (form, history tabs) to client components.
async function SupportContent() {
  const [me, issues] = await Promise.all([getMe(), getSupportIssues()]);
  const active = issues.filter((i) => i.status !== "resolved").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <PageHeader
        eyebrow={me.tenant.name}
        title="Support"
        description={`Report a problem with the ${PLATFORM_NAME} platform to the ${PLATFORM_TEAM}. This is for problems with the platform itself, not for your callers' tickets.`}
      >
        <dl className="text-sm">
          <dt className="text-slate-500">Active issues</dt>
          <dd className="text-xl font-semibold tabular-nums text-slate-900">{active}</dd>
        </dl>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Raise an issue</h2>
          {/* The server action is passed to the client form as a prop. */}
          <SupportForm action={submitSupportIssue} />
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold text-slate-900">Response times</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {ISSUE_SEVERITIES.map((s) => (
                <div key={s} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityMeta[s].dot}`} aria-hidden />
                  <div>
                    <dt className="font-medium text-slate-900">{severityMeta[s].label}</dt>
                    <dd className="text-slate-600">{severityMeta[s].response}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <h2 className="font-semibold text-slate-900">Emergency on a live call?</h2>
            <p className="mt-1">
              Choose <span className="font-medium text-slate-900">Critical</span>. The on-call
              platform engineer is paged immediately.
            </p>
          </div>
        </aside>
      </div>

      <section className="mt-12">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Your issue history
        </h2>
        <IssueHistory issues={issues} />
      </section>
    </main>
  );
}
