/** Placeholder shown while matches load. Sized like the real page so nothing jumps when data arrives. */
export function MatchesSkeleton() {
  return (
    <main role="status" className="mx-auto w-full max-w-[920px] px-4 py-6 sm:px-6">
      <span className="sr-only">Loading matches</span>
      <div className="skeleton h-9 w-44 rounded-lg" />
      <div className="mt-5 flex gap-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {[0, 1].map((card) => (
          <div key={card} className="overflow-hidden rounded-xl border border-line bg-panel">
            <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
              <div className="skeleton size-5 rounded-full" />
              <div className="skeleton h-5 w-40 rounded" />
            </div>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between gap-4 border-t border-line-soft px-4 py-3.5 first:border-t-0">
                <div className="skeleton h-4 w-12 rounded" />
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-6 w-14 rounded" />
                <div className="skeleton h-4 w-32 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
