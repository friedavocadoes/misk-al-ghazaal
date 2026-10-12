import { Sk } from "@/components/ui/skeleton";

// Collection skeleton, mirroring collection/[slug]: centered banner head,
// refine sidebar + product grid.
export default function CollectionLoading() {
  return (
    <div className="animate-[loading-fade_0.4s_ease-out]" aria-hidden>
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <Sk className="h-3 w-56 max-w-full" />
        <div className="border-b border-ink/10 pb-8 pt-6 text-center">
          <Sk className="mx-auto h-3 w-32" />
          <Sk className="mx-auto mt-3 h-11 w-80 max-w-full" />
          <Sk className="mx-auto mt-3 h-4 w-96 max-w-full" />
          <Sk className="mx-auto mt-3 h-3 w-24" />
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr]">
          <div className="h-fit border border-ink/10 bg-white p-6">
            <div className="flex items-center justify-between">
              <Sk className="h-3 w-20" />
              <Sk className="h-3 w-12" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mt-5 border-t border-ink/10 pt-5">
                <Sk className="h-3 w-28" />
                <Sk className="mt-3 h-9 w-full" />
                <Sk className="mt-2 h-9 w-full" />
              </div>
            ))}
            <Sk className="mt-6 h-11 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Sk className="aspect-[3/4]" />
                <Sk className="mx-auto mt-3 h-4 w-2/3" />
                <Sk className="mx-auto mt-2 h-3 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
