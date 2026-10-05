"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";

// Full-bleed editorial hero. Edge-to-edge imagery, serif display type,
// slide counter + hairline progress — quiet luxury, no boxes or pills.
export function HeroSlider({ slides }: { slides: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    let raf = 0;
    let start = Date.now();
    const DURATION = 6500;
    const tick = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(1, elapsed / DURATION));
      if (elapsed >= DURATION) {
        emblaApi.scrollNext();
        start = Date.now();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const reset = () => {
      start = Date.now();
    };
    emblaApi.on("select", reset);
    return () => {
      cancelAnimationFrame(raf);
      emblaApi.off("select", onSelect);
      emblaApi.off("select", reset);
    };
  }, [emblaApi, onSelect]);

  return (
    <section aria-label="Featured" className="relative bg-ink text-white">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((s, i) => (
            <div key={s.src} className="relative min-w-0 flex-[0_0_100%]">
              <SafeImage
                src={s.src}
                fallback={s.fallback}
                alt={s.alt}
                width={2000}
                height={1100}
                priority={i === 0}
                className="h-[72svh] min-h-[480px] w-full object-cover opacity-90 md:h-[86svh]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-24 md:px-10 md:pb-28">
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft">
                  <span className="inline-block h-px w-10 bg-gold-soft" />
                  {s.eyebrow}
                </p>
                {s.title && (
                  <h2 className="mt-4 max-w-2xl font-display text-5xl leading-[1.02] md:text-7xl">
                    {s.title}
                  </h2>
                )}
                {s.desc && (
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 md:text-base">
                    {s.desc}
                  </p>
                )}
                {s.cta && s.href && (
                  <div className="mt-8 flex items-center gap-8">
                    <Link
                      href={s.href}
                      className="bg-white px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-gold-wash"
                    >
                      {s.cta}
                    </Link>
                    <Link
                      href="/collections"
                      className="link-underline hidden text-[12px] font-semibold uppercase tracking-[0.2em] text-white/85 sm:inline"
                    >
                      Explore All
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Counter + progress + arrows */}
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-7xl px-5 pb-8 md:px-10">
        <div className="flex items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="font-display text-lg italic">
              {String(selected + 1).padStart(2, "0")}
            </span>
            <span className="relative h-px w-28 overflow-hidden bg-white/25 md:w-44">
              <span
                className="absolute inset-y-0 left-0 bg-gold-soft"
                style={{
                  width: `${((selected + progress) / slides.length) * 100}%`,
                }}
              />
            </span>
            <span className="text-xs tracking-[0.2em] text-white/60">
              {String(slides.length).padStart(2, "0")}
            </span>
          </div>
          <div className="flex gap-2">
            {([-1, 1] as const).map((dir) => (
              <button
                key={dir}
                onClick={() =>
                  dir === -1
                    ? emblaApi?.scrollPrev()
                    : emblaApi?.scrollNext()
                }
                aria-label={dir === -1 ? "Previous slide" : "Next slide"}
                className={cn(
                  "border border-white/40 p-2.5 text-white transition hover:border-white hover:bg-white hover:text-ink"
                )}
              >
                {dir === -1 ? (
                  <ArrowLeft className="size-4" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
