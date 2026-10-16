import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pick, tx } from "@/lib/i18n";
import { STORY_SECTION_DEFAULTS } from "@/lib/site";
import type { HomepageSectionConfig } from "@/lib/store";

export async function StoryBlock({
  eyebrow,
  title,
  config,
}: {
  eyebrow?: string;
  title?: string;
  config?: HomepageSectionConfig;
} = {}) {
  const t = await getTranslations("Sections");
  const rawLocale = await getLocale();
  const locale = (rawLocale === "ar" ? "ar" : "en") as Locale;

  const primaryImg = config?.src || STORY_SECTION_DEFAULTS.primaryImage;
  const secondaryImg =
    config?.secondarySrc || STORY_SECTION_DEFAULTS.secondaryImage;
  const badgeText = config?.badge
    ? tx(config.badge, config.badgeAr, locale)
    : pick(STORY_SECTION_DEFAULTS.badge, locale);
  const storyEyebrow = eyebrow || t("storyEyebrow");
  const storyTitle = title || t("storyTitle");
  const storyBody = config?.desc
    ? tx(config.desc, config.descAr, locale)
    : t("storyText");
  const primaryCta = config?.cta
    ? tx(config.cta, config.ctaAr, locale)
    : t("storyCta");
  const primaryHref = config?.href || STORY_SECTION_DEFAULTS.primaryHref;
  const secondaryCta = config?.secondaryCta
    ? tx(config.secondaryCta, config.secondaryCtaAr, locale)
    : pick(STORY_SECTION_DEFAULTS.secondaryLabel, locale);
  const secondaryHref =
    config?.secondaryHref || STORY_SECTION_DEFAULTS.secondaryHref;

  return (
    <section className="relative overflow-hidden border-y border-ink/10 bg-sand/55 py-20 md:py-26">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:px-8 lg:grid-cols-[1.08fr_1fr] lg:gap-16">
        {/* Overlapping Architectural Dual-Frame Composition */}
        <div className="relative pb-8 pr-6 sm:pb-12 sm:pr-12">
          <div className="relative aspect-[16/11] overflow-hidden border border-ink/10 bg-ink shadow-[0_32px_64px_-28px_rgba(28,25,23,0.35)]">
            <Image
              src={primaryImg}
              alt={storyTitle}
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-3 border border-gold-soft/35"
            />
          </div>

          <div className="absolute bottom-0 right-0 w-[52%] overflow-hidden border-2 border-cream bg-ink shadow-[0_24px_48px_-20px_rgba(28,25,23,0.45)]">
            <div className="relative aspect-[16/10]">
              <Image
                src={secondaryImg}
                alt=""
                fill
                sizes="(min-width:1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          {badgeText && (
            <div className="absolute left-4 top-4 border border-gold/40 bg-cream/95 px-4 py-2.5 backdrop-blur-md">
              <p className="font-display text-xs italic tracking-[0.18em] text-gold">
                {badgeText}
              </p>
            </div>
          )}
        </div>

        {/* Clean Editorial Narrative (no icon clutter) */}
        <div>
          <p className="eyebrow flex items-center gap-3 text-gold">
            <span className="inline-block h-px w-8 bg-gold" />
            {storyEyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl leading-[1.1] text-ink md:text-5xl">
            {storyTitle}
          </h2>
          <span className="mt-5 block h-px w-16 bg-gold-soft" />
          <p className="mt-6 max-w-lg text-[14.5px] leading-[1.85] text-espresso">
            {storyBody}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link
              href={primaryHref}
              className="group inline-flex items-center gap-2.5 border border-ink bg-ink px-7 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-all duration-300 hover:border-gold hover:bg-gold"
            >
              <span>{primaryCta}</span>
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            {secondaryCta && (
              <Link
                href={secondaryHref}
                className="link-underline text-[11px] font-semibold uppercase tracking-[0.22em] text-ink hover:text-gold"
              >
                {secondaryCta}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
