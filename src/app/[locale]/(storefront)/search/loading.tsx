import { Sk } from "@/components/ui/skeleton";

// Search skeleton: title + result count, then the same refine sidebar +
// grid the results page renders into.
export default function SearchLoading() {
  return (
    <div className="animate-[loading-fade_0.4s_ease-out]" aria-hidden>
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <Sk className="h-3 w-24" />
        <Sk className="mt-2.5 h-11 w-96 max-w-full" />
        <Sk className="mt-3 h-4 w-40" />
        <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
          <div className="h-fit border border-ink/10 bg-white p-6">
            <Sk className="h-3 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mt-5 border-t border-ink/10 pt-5">
                <Sk className="h-3 w-28" />
                <Sk className="mt-3 h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Sk className="aspect-[3/4]" />
                <Sk className="mx-auto mt-3 h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
