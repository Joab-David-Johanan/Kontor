"use client";

// Friendly error screen used by error.tsx files (error boundaries must be client components).

import { useEffect } from "react";

export function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error); // visible in the browser console for debugging
  }, [error]);

  // In development Next.js passes the real message; in production it is hidden.
  const message = error instanceof Error && error.message ? error.message : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
      <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900">This page couldn&apos;t load its data</h1>
        <p className="mt-2 text-sm text-red-800">
          The Kontor API may not be running, or it rejected the request.
        </p>
        {message && (
          <p className="mt-3 rounded bg-white/70 px-3 py-2 font-mono text-xs text-red-900">
            {message}
          </p>
        )}
        <p className="mt-3 text-sm text-red-800">
          Start it with{" "}
          <code className="font-mono">docker compose -f deploy/compose/docker-compose.yml up -d</code>,
          then try again.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-5 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
