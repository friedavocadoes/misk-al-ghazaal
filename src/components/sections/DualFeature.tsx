import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { DUAL_FEATURE_DEFAULTS } from "@/lib/site";
import type { HomepageSectionConfig } from "@/lib/store";

export async function DualFeature({
  config,
}: {
  config?: HomepageSectionConfig;
} = {}) {
  const t = await getTranslations("Sections");
  const rawLocale = await getLocale();
  const locale = (rawLocale === "ar" ? "ar" : "en") as Locale;

  const panels = [
    {
      tag: DUAL_FEATURE_DEFAULTS.left.tag,
      src: config?.leftSrc || DUAL_FEATURE_DEFAULTS.left.image,
      href: config?.leftHref || DUAL_FEATURE_DEFAULTS.left.href,
      eyebrow: config?.leftEyebrow
        ? tx(config.leftEyebrow, config.leftEyebrowAr, locale)
        : t("lineEyebrow"),
      title: config?.leftTitle
        ? tx(config.leftTitle, config.leftTitleAr, locale)
        : t("lineTitle"),
      cta: config?.leftCta
        ? tx(config.leftCta, config.leftCtaAr, locale)
        : t("lineCta"),
    },
    {
      tag: DUAL_FEATURE_DEFAULTS.right.tag,
      src: config?.rightSrc || DUAL_FEATURE_DEFAULTS.right.image,
      href: config?.rightHref || DUAL_FEATURE_DEFAULTS.right.href,
      eyebrow: config?.rightEyebrow
        ? tx(config.rightEyebrow, config.rightEyebrowAr, locale)
        : t("partnerEyebrow"),
      title: config?.rightTitle
        ? tx(config.rightTitle, config.rightTitleAr, locale)
        : t("partnerTitle"),
      cta: config?.rightCta
        ? tx(config.rightCta, config.rightCtaAr, locale)
        : t("partnerCta"),
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
      <div className="grid gap-6 md:grid-cols-2">
        {panels.map((p) => (
          <Link
            key={p.tag}
            href={p.href}
            className="group relative block overflow-hidden border border-ink/10 bg-ink"
          >
            <span className="relative block aspect-[16/11]">
              <Image
                src={p.src}
                alt={p.title}
                fill
                sizes="(min-width:768px) 50vw, 100vw"
                className="object-cover transition duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
              />
            </span>
            <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-4 border border-white/15 transition-colors duration-500 group-hover:border-gold-soft/65"
            />
            <span className="absolute inset-x-0 top-0 flex items-center justify-between p-7">
              <span className="font-display text-xs italic tracking-[0.2em] text-gold-soft">
                {p.tag}
              </span>
              <span className="flex size-9 items-center justify-center border border-white/20 bg-ink/40 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-gold-soft group-hover:bg-gold-soft group-hover:text-ink">
                <ArrowUpRight className="size-4" />
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 p-8 md:p-10">
              <span className="eyebrow text-gold-soft">{p.eyebrow}</span>
              <span className="mt-2.5 block font-display text-3xl leading-tight text-cream md:text-4xl">
                {p.title}
              </span>
              <span className="mt-5 inline-flex items-center gap-2 border border-white/25 bg-white/10 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-sm transition-all duration-300 group-hover:border-gold-soft group-hover:bg-cream group-hover:text-ink">
                {p.cta}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
