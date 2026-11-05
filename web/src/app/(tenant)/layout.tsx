import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";

// Layout for the TENANT portal: every page inside app/(tenant)/ is wrapped by it.
// The folder name "(tenant)" is in brackets, so it does NOT appear in the URL:
// app/(tenant)/dashboard/page.tsx is still "/dashboard".
export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* stays on screen while you switch between tenant pages */}
      <AppHeader />
      {children}
    </>
  );
}
