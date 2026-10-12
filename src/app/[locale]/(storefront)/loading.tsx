import { Sk } from "@/components/ui/skeleton";

// Home fallback: mirrors the storefront home composition — fullscreen hero
// plate, section heading, product strip, split panels. loading.tsx is the
// segment boundary, so NOTHING of the home page renders until it is fully
// ready; visitors see the maison frame, never a half-built page.
export default function StorefrontLoading() {
  return (
    <div className="animate-[loading-fade_0.4s_ease-out]" aria-hidden>
      <div className="relative h-[72svh] min-h-[480px] bg-sand">
        <Sk className="absolute inset-0" />
        <div className="absolute inset-x-0 bottom-12 mx-auto max-w-xl space-y-4 px-5 text-center">
          <Sk className="mx-auto h-3 w-32" />
          <Sk className="mx-auto h-10 w-80 max-w-full" />
          <Sk className="mx-auto h-4 w-56" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <Sk className="mx-auto h-3 w-36" />
        <Sk className="mx-auto mt-4 h-9 w-72 max-w-full" />
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Sk className="aspect-[3/4]" />
              <Sk className="mx-auto mt-3 h-4 w-2/3" />
              <Sk className="mx-auto mt-2 h-3 w-1/3" />
            </div>
          ))}
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <Sk className="aspect-[16/10]" />
          <Sk className="aspect-[16/10]" />
        </div>
      </div>
    </div>
  );
}
