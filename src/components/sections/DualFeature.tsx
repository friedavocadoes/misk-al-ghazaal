import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

// Dual editorial panels: the maison's own line vs. manufacturing for others.
export async function DualFeature() {
  const t = await getTranslations("Sections");
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/collection/misk-al-ghazaal"
          className="group relative block overflow-hidden border border-ink/10 bg-ink"
        >
          <span className="relative block aspect-[16/11]">
            <Image
              src="/banners/hero-misk-signature.jpg"
              alt="The Misk Al Ghazaal maison line"
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
              I · LA MAISON
            </span>
            <span className="flex size-9 items-center justify-center border border-white/20 bg-ink/40 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-gold-soft group-hover:bg-gold-soft group-hover:text-ink">
              <ArrowUpRight className="size-4" />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 p-8 md:p-10">
            <span className="eyebrow text-gold-soft">{t("lineEyebrow")}</span>
            <span className="mt-2.5 block font-display text-3xl leading-tight text-cream md:text-4xl">
              {t("lineTitle")}
            </span>
            <span className="mt-5 inline-flex items-center gap-2 border border-white/25 bg-white/10 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-sm transition-all duration-300 group-hover:border-gold-soft group-hover:bg-cream group-hover:text-ink">
              {t("lineCta")}
            </span>
          </span>
        </Link>

        <Link
          href="/private-label"
          className="group relative block overflow-hidden border border-ink/10 bg-ink"
        >
          <span className="relative block aspect-[16/11]">
            <Image
              src="/banners/hero-private-label.jpg"
              alt="Manufacturing for private labels"
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
              II · L&apos;ATELIER
            </span>
            <span className="flex size-9 items-center justify-center border border-white/20 bg-ink/40 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-gold-soft group-hover:bg-gold-soft group-hover:text-ink">
              <ArrowUpRight className="size-4" />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 p-8 md:p-10">
            <span className="eyebrow text-gold-soft">
              {t("partnerEyebrow")}
            </span>
            <span className="mt-2.5 block font-display text-3xl leading-tight text-cream md:text-4xl">
              {t("partnerTitle")}
            </span>
            <span className="mt-5 inline-flex items-center gap-2 border border-white/25 bg-white/10 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-cream backdrop-blur-sm transition-all duration-300 group-hover:border-gold-soft group-hover:bg-cream group-hover:text-ink">
              {t("partnerCta")}
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
