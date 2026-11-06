import { Suspense } from "react";
import Link from "next/link";
import { getMe } from "@/lib/api";
import { PLATFORM_NAME } from "@/lib/platform";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

// Server component: the bar at the top of every tenant page (used in app/(tenant)/layout.tsx).
export function AppHeader() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 sm:px-8">
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-900">
          {PLATFORM_NAME}
        </Link>
        {/* Navigation, tenant and user depend on WHO is signed in (live data), so they
            stream in inside <Suspense> while the logo shows immediately. */}
        <Suspense fallback={<div className="h-8 flex-1 animate-pulse rounded bg-slate-50" />}>
          <SignedInBar />
        </Suspense>
      </div>
    </div>
  );
}

async function SignedInBar() {
  // Only the data fetch is guarded; the JSX is built afterwards.
  const me = await getMe().catch(() => null);

  if (!me) {
    return (
      <div className="flex flex-1 justify-end">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          API offline
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
      <NavLinks isAdmin={me.role === "tenant_admin"} />
      <div className="flex items-center gap-4">
        <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">
          {me.tenant.name}
        </span>
        <UserMenu name={me.name} role={me.role} />
      </div>
    </div>
  );
}
