"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";

// Converted from sections/Ishi_slideshow.liquid (slide_image blocks).
// Slides reference the EXACT original files in public/banners/ (see
// lib/mock-data MISSING_BANNERS); SafeImage falls back to a local product
// photo until you drop the real file in.
export function HeroSlider({ slides }: { slides: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    const t = setInterval(() => emblaApi.scrollNext(), 6000);
    return () => {
      emblaApi.off("select", onSelect);
      clearInterval(t);
    };
  }, [emblaApi, onSelect]);

  return (
    <section aria-label="Featured banners">
      <div className="relative overflow-hidden rounded-3xl bg-emerald-950">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {slides.map((s) => (
              <div key={s.src} className="relative min-w-0 flex-[0_0_100%]">
                <SafeImage
                  src={s.src}
                  fallback={s.fallback}
                  alt={s.alt}
                  width={1600}
                  height={700}
                  priority={s.src === slides[0]?.src}
                  className="h-[320px] w-full object-cover opacity-80 md:h-[440px]"
                />
                <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/55 via-black/20 to-transparent p-8 md:p-14">
                  {s.eyebrow && (
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
                      {s.eyebrow}
                    </p>
                  )}
                  {s.title && (
                    <h2 className="mt-2 max-w-md text-4xl font-bold text-white md:text-5xl">
                      {s.title}
                    </h2>
                  )}
                  {s.desc && (
                    <p className="mt-3 max-w-md text-sm text-white/85 md:text-base">
                      {s.desc}
                    </p>
                  )}
                  {s.cta && s.href && (
                    <div className="mt-6">
                      <Button asChild variant="gold" size="lg">
                        <Link href={s.href}>{s.cta}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous slide"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next slide"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
        >
          <ChevronRight className="size-5" />
        </button>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.src}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === selected ? "w-6 bg-white" : "w-1.5 bg-white/50"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
