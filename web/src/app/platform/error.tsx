"use client"; // error boundaries must be client components

import { PageError } from "@/components/page-error";

export default function PlatformError({ error, retry }: { error: unknown; retry: () => void }) {
  return <PageError error={error} retry={retry} />;
}
