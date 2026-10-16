"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";

export function ProductCarouselClient({
  eyebrow,
  title,
  products,
  viewAllHref,
  viewAllLabel,
}: {
  eyebrow?: string;
  title: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel: string;
}) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    direction: isRtl ? "rtl" : "ltr",
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [progress, setProgress] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  const onScroll = useCallback(() => {
    if (!emblaApi) return;
    const p = Math.max(0, Math.min(1, emblaApi.scrollProgress()));
    setProgress(p);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    onScroll();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("scroll", onScroll);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("scroll", onScroll);
    };
  }, [emblaApi, onSelect, onScroll]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-22">
      {/* Editorial Section Header with Carousel Controls */}
      <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end">
        <div>
          {eyebrow && (
            <p className="eyebrow flex items-center gap-3 text-gold">
              <span className="inline-block h-px w-8 bg-gold" />
              {eyebrow}
            </p>
          )}
          <h2 className="mt-2.5 font-display text-3xl leading-tight text-ink md:text-4xl lg:text-[2.65rem]">
            {viewAllHref ? (
              <Link
                href={viewAllHref}
                className="transition-colors duration-300 hover:text-gold"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
        </div>

        <div className="flex w-full items-center justify-between gap-5 sm:w-auto sm:justify-end">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition hover:text-gold"
            >
              <span>{viewAllLabel}</span>
              <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}
          {products.length > 4 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canPrev}
                aria-label="Previous products"
                className="flex size-9 cursor-pointer items-center justify-center border border-ink/15 bg-cream text-ink transition-all duration-300 hover:border-gold hover:bg-gold-wash disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowLeft className="size-4 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canNext}
                aria-label="Next products"
                className="flex size-9 cursor-pointer items-center justify-center border border-ink/15 bg-cream text-ink transition-all duration-300 hover:border-gold hover:bg-gold-wash disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowRight className="size-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Embla Viewport */}
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container -ml-5 rtl:-ml-0 rtl:-mr-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="min-w-0 shrink-0 grow-0 basis-[76%] pl-5 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 rtl:pl-0 rtl:pr-5"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Subtle Gold Progress Bar */}
      {products.length > 4 && (
        <div className="mt-10 flex items-center gap-4">
          <div className="relative h-[2px] w-full overflow-hidden bg-ink/10">
            <span
              className="absolute inset-y-0 left-0 bg-gold transition-all duration-150 ease-out rtl:left-auto rtl:right-0"
              style={{
                width: `${Math.max(25, progress * 100)}%`,
              }}
            />
          </div>
          <span className="shrink-0 font-display text-xs italic text-fog">
            {String(products.length).padStart(2, "0")}
          </span>
        </div>
      )}
    </section>
  );
}
