import Link from "next/link";
import { CURRENT_TENANT } from "@/lib/config";
import { NavLinks } from "./nav-links";

// Server component: the bar at the top of every page (used in app/layout.tsx).
// Only the interactive part (NavLinks) is a client component.
export function AppHeader() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-slate-900">
            Kontor
          </Link>
          <NavLinks />
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {CURRENT_TENANT.name}
        </span>
      </div>
    </div>
  );
}
