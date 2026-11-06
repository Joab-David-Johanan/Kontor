// Grey placeholder blocks shown while a page's data is loading (used by loading.tsx).
export function PageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-6xl animate-pulse px-4 py-10 sm:px-8"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="mb-8 border-b border-slate-200 pb-6">
        <div className="h-4 w-32 rounded bg-slate-100" />
        <div className="mt-3 h-7 w-56 rounded bg-slate-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-lg border border-slate-200 bg-slate-50" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-lg border border-slate-200 bg-slate-50" />
    </main>
  );
}
