"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { pick, tx } from "@/lib/i18n";
import { WORLDS_SECTION_DEFAULTS } from "@/lib/site";
import { DeviceBannerImage } from "@/components/blocks/DeviceBannerImage";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function BannerSplit({
  banners,
  eyebrow,
  title,
  ctaLabel,
  ctaHref,
}: {
  banners: Banner[];
  eyebrow?: string;
  title?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  if (!banners.length) return null;

  const sectionEyebrow =
    eyebrow || pick(WORLDS_SECTION_DEFAULTS.eyebrow, locale);
  const sectionTitle =
    title || pick(WORLDS_SECTION_DEFAULTS.title, locale);
  const sectionLinkLabel =
    ctaLabel || pick(WORLDS_SECTION_DEFAULTS.linkLabel, locale);
  const sectionLinkHref = ctaHref || WORLDS_SECTION_DEFAULTS.linkHref;

  // Dynamically adapt column count if admin adds 4+ brand world cards
  const gridCols =
    banners.length === 4
      ? "md:grid-cols-2 lg:grid-cols-4"
      : banners.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-3";

  return (
    <section
      aria-label={sectionTitle}
      className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-18"
    >
      <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow flex items-center gap-3 text-gold">
            <span className="inline-block h-px w-8 bg-gold" />
            {sectionEyebrow}
          </p>
          <h2 className="mt-2.5 font-display text-3xl text-ink md:text-4xl">
            {sectionTitle}
          </h2>
        </div>
        <Link
          href={sectionLinkHref}
          className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink transition hover:text-gold"
        >
          <span>{sectionLinkLabel}</span>
          <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>

      <div className={`grid gap-5 ${gridCols}`}>
        {banners.map((b, idx) => {
          const preset =
            WORLDS_SECTION_DEFAULTS.cardFallbacks[
              idx % WORLDS_SECTION_DEFAULTS.cardFallbacks.length
            ];
          const fallbackSrc = b.fallback || preset?.src || b.src;
          const cardSubtitle = b.eyebrow
            ? tx(b.eyebrow, b.eyebrowAr, locale)
            : preset
              ? pick(preset.eyebrow, locale)
              : "";
          const cardDesc = b.desc ? tx(b.desc, b.descAr, locale) : "";
          const cardCta = b.cta
            ? tx(b.cta, b.ctaAr, locale)
            : pick(WORLDS_SECTION_DEFAULTS.cardCtaFallback, locale);

          return (
            <Link
              key={(b.id ?? b.src) + idx}
              href={b.href ?? "/collections"}
              className="group relative block aspect-[4/5] overflow-hidden border border-ink/10 bg-ink"
            >
              <DeviceBannerImage
                src={b.src} mobileSrc={b.mobileSrc} mobileFallback={b.mobileFallback}
                fallback={fallbackSrc}
                alt={b.alt}
                fill
                sizes="(min-width:768px) 33vw, 100vw"
                style={{ objectPosition:b.focal||"center", objectFit:b.fit||"cover" }}
                className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
              />

              <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-ink/15 transition-opacity duration-500 group-hover:opacity-95" />

              <span
                aria-hidden
                className="pointer-events-none absolute inset-4 border border-white/15 transition-colors duration-500 group-hover:border-gold-soft/65"
              />

              <span className="absolute inset-x-0 top-0 flex items-center justify-between p-7">
                <span className="font-display text-xs italic tracking-[0.2em] text-gold-soft">
                  {ROMAN[idx] ?? `0${idx + 1}`}
                </span>
                <span className="flex size-8 items-center justify-center border border-white/20 bg-ink/30 text-white backdrop-blur-sm transition-all duration-500 group-hover:border-gold-soft group-hover:bg-gold-soft group-hover:text-ink">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </span>

              <span className="absolute inset-x-0 bottom-0 p-7">
                {cardSubtitle && (
                  <span className="block text-[9.5px] font-semibold uppercase tracking-[0.26em] text-gold-soft">
                    {cardSubtitle}
                  </span>
                )}
                {b.title && (
                  <span className="mt-2 block font-display text-2xl leading-tight text-cream md:text-3xl">
                    {tx(b.title, b.titleAr, locale)}
                  </span>
                )}
                {cardDesc && (
                  <span className="mt-2 line-clamp-2 block text-[12.5px] leading-relaxed text-cream/80">
                    {cardDesc}
                  </span>
                )}
                <span className="mt-4 inline-flex items-center gap-2 border-b border-gold-soft/60 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cream transition-all duration-300 group-hover:border-gold-soft group-hover:text-gold-wash">
                  {cardCta}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
