import { Sk } from "@/components/ui/skeleton";

// PDP skeleton, mirroring product/[slug]: breadcrumb, gallery + buy-box
// grid, then the About / notes / ritual / accordion / reviews bands.
export default function ProductLoading() {
  return (
    <div className="animate-[loading-fade_0.4s_ease-out]" aria-hidden>
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <Sk className="h-3 w-64 max-w-full" />
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <Sk className="aspect-square" />
            <div className="mt-3 grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Sk key={i} className="aspect-square" />
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <Sk className="h-3 w-28" />
            <Sk className="mt-3 h-10 w-4/5" />
            <Sk className="mt-2 h-6 w-3/5" />
            <div className="mt-3 flex items-center gap-2">
              <Sk className="h-4 w-24" />
              <Sk className="h-4 w-32" />
            </div>
            <Sk className="mt-5 h-8 w-44" />
            <Sk className="mt-4 h-16 w-full" />
            <div className="mt-7 flex gap-2">
              <Sk className="h-[52px] w-24" />
              <Sk className="h-[52px] flex-1" />
              <Sk className="h-[52px] w-[52px]" />
            </div>
            <Sk className="mt-2 h-[52px] w-full" />
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-3xl space-y-4 text-center">
          <Sk className="mx-auto h-3 w-28" />
          <Sk className="mx-auto h-8 w-2/3" />
          <Sk className="h-16 w-full" />
        </div>
        <Sk className="mt-12 aspect-[21/9] w-full" />
        <div className="mt-12 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Sk key={i} className="h-14 w-full" />
          ))}
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Sk className="h-40" />
          <Sk className="h-40" />
        </div>
      </div>
    </div>
  );
}
