import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Platform", template: "%s · Kontor Platform" },
};

// Layout for the PLATFORM portal (CLAR AI staff). Every page under app/platform/
// gets this dark bar instead of the tenant navigation.
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/platform/support" className="text-base font-semibold tracking-tight">
              Kontor
            </Link>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-200">
              Platform staff
            </span>
          </div>
          <span className="text-xs text-slate-300">CLAR AI · internal</span>
        </div>
      </div>
      <div className="border-b border-amber-200 bg-amber-50">
        <p className="mx-auto w-full max-w-6xl px-4 py-2 text-xs text-amber-900 sm:px-8">
          Demo: this portal will require a <code>platform_admin</code> login in Milestone 3. Until
          then it is reachable by URL only.
        </p>
      </div>
      {children}
    </>
  );
}
