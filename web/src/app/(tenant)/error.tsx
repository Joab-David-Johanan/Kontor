"use client"; // error boundaries must be client components

import { PageError } from "@/components/page-error";

// Shown when a tenant page throws, e.g. because the API is down.
// retry() renders the page again without a full browser reload.
export default function TenantError({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError error={error} retry={retry} />;
}
