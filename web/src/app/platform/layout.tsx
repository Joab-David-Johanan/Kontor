import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/api";
import { PLATFORM_NAME } from "@/lib/platform";
import { UserMenu } from "@/components/user-menu";

export const metadata: Metadata = {
  title: { default: "Platform", template: `%s · ${PLATFORM_NAME} Platform` },
};

// Layout for the PLATFORM portal (the staff who run the platform). Every page under
// app/platform/ gets this dark bar instead of the tenant navigation. proxy.ts only lets
// people signed in through the platform-staff realm in here; the API checks the role again.
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/platform/support" className="text-base font-semibold tracking-tight">
              {PLATFORM_NAME}
            </Link>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-200">
              Platform staff
            </span>
          </div>
          <Suspense fallback={<span className="h-8 w-40 animate-pulse rounded bg-white/10" />}>
            <StaffUser />
          </Suspense>
        </div>
      </div>
      {children}
    </>
  );
}

async function StaffUser() {
  const me = await getCurrentUser().catch(() => null);
  if (!me) return <span className="text-xs text-amber-300">API offline</span>;
  return <UserMenu name={me.name} role={me.role} dark />;
}
