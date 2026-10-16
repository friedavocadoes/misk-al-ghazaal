"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { SafeImage } from "@/components/ui/safe-image";

const ROMAN = ["I", "II", "III", "IV"];

const LUXURY_BRAND_FALLBACKS = [
  "/banners/brand-maison-boutique.jpg",
  "/banners/brand-holy-oudh.jpg",
  "/banners/brand-maison-exclusives.jpg",
];

const CHAPTER_SUBTITLES: { en: string; ar: string }[] = [
  {
    en: "Signature Parfums & Pure Misk",
    ar: "العطور التوقيعية والمسك الخالص",
  },
  {
    en: "Rare Aged Agarwood & Dehn Al Oud",
    ar: "العود المعتّق ودهن العود الملكي",
  },
  {
    en: "Limited Editions & Artisanal Bakhoor",
    ar: "الإصدارات الحصرية والبخور الفاخر",
  },
];

export function BannerSplit({ banners }: { banners: Banner[] }) {
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  if (!banners.length) return null;

  return (
    <section
      aria-label="Maison Chapters"
      className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16"
    >
      <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow flex items-center gap-3 text-gold">
            <span className="inline-block h-px w-8 bg-gold" />
            {locale === "ar" ? "أركان الدار الثلاثة" : "The Three Pillars"}
          </p>
          <h2 className="mt-2.5 font-display text-3xl text-ink md:text-4xl">
            {locale === "ar"
              ? "عوالم مسك الغزال العطرية"
              : "Worlds of Misk Al Ghazaal"}
          </h2>
        </div>
        <Link
          href="/collections"
          className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition hover:text-gold"
        >
          <span>
            {locale === "ar" ? "استكشف المجموعات" : "Explore All Collections"}
          </span>
          <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {banners.map((b, idx) => {
          const fallbackSrc =
            LUXURY_BRAND_FALLBACKS[idx % LUXURY_BRAND_FALLBACKS.length] ??
            b.fallback;
          const subtitle =
            CHAPTER_SUBTITLES[idx % CHAPTER_SUBTITLES.length];

          return (
            <Link
              key={b.src + idx}
              href={b.href ?? "/collections"}
              className="group relative block aspect-[4/5] overflow-hidden border border-ink/10 bg-ink"
            >
              <SafeImage
                src={b.src}
                fallback={fallbackSrc}
                alt={b.alt}
                fill
                sizes="(min-width:768px) 33vw, 100vw"
                className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
              />

              {/* Chiaroscuro vignette */}
              <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-ink/15 transition-opacity duration-500 group-hover:opacity-95" />

              {/* Inset gold frame that illuminates on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-4 border border-white/15 transition-colors duration-500 group-hover:border-gold-soft/65"
              />

              {/* Top Roman Chapter Index */}
              <span className="absolute inset-x-0 top-0 flex items-center justify-between p-7">
                <span className="font-display text-xs italic tracking-[0.2em] text-gold-soft">
                  {ROMAN[idx] ?? `0${idx + 1}`}
                </span>
                <span className="flex size-8 items-center justify-center border border-white/20 bg-ink/30 text-white backdrop-blur-sm transition-all duration-500 group-hover:border-gold-soft group-hover:bg-gold-soft group-hover:text-ink">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </span>

              {/* Bottom Narrative Overlay */}
              <span className="absolute inset-x-0 bottom-0 p-7">
                {subtitle && (
                  <span className="block text-[9.5px] font-semibold uppercase tracking-[0.26em] text-gold-soft">
                    {locale === "ar" ? subtitle.ar : subtitle.en}
                  </span>
                )}
                {b.title && (
                  <span className="mt-2 block font-display text-2xl leading-tight text-cream md:text-3xl">
                    {tx(b.title, b.titleAr, locale)}
                  </span>
                )}
                <span className="mt-4 inline-flex items-center gap-2 border-b border-gold-soft/60 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cream transition-all duration-300 group-hover:border-gold-soft group-hover:text-gold-wash">
                  {locale === "ar" ? "اكتشف الركن" : "Enter Gallery"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
