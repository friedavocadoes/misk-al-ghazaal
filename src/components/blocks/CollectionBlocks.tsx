import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { SectionHeading } from "./ProductCarousel";

export function CategoryTiles({
  categories,
  locale,
  eyebrow = "The Library",
  title = "Shop by Ritual",
}: {
  categories: Category[];
  locale: Locale;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {categories.slice(0, 4).map((c, idx) => (
          <Link key={c.slug} href={`/collection/${c.slug}`} className="group">
            <span className="relative block aspect-[3/4] overflow-hidden border border-ink/10 bg-sand">
              <Image
                src={c.image}
                alt={tx(c.title, c.titleAr, locale)}
                fill
                sizes="(min-width:1024px) 25vw, 50vw"
                className="object-cover transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/15 to-transparent" />
              <span className="absolute left-4 top-4 font-display text-xs italic text-gold-soft">
                0{idx + 1}
              </span>
              <span className="absolute inset-x-0 bottom-0 p-5 pt-10">
                <span className="block font-display text-xl text-cream">
                  {tx(c.title, c.titleAr, locale)}
                </span>
                <span className="link-underline mt-1.5 inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-wash">
                  {locale === "ar" ? "استكشف" : "Discover"}
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CollectionGrid({
  categories,
  locale,
}: {
  categories: Category[];
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c, idx) => {
        const isLead = idx === 0;
        return (
          <Link
            key={c.slug}
            href={`/collection/${c.slug}`}
            className={`group relative flex flex-col justify-between overflow-hidden border border-ink/10 bg-sand/40 transition-all duration-500 hover:border-gold/50 ${
              isLead ? "sm:col-span-2 lg:col-span-2" : ""
            }`}
          >
            <span
              className={`flacon-pedestal relative block w-full overflow-hidden ${
                isLead ? "aspect-[16/10] sm:aspect-[16/9]" : "aspect-[4/4.5]"
              }`}
            >
              <Image
                src={c.image}
                alt={tx(c.title, c.titleAr, locale)}
                fill
                sizes={
                  isLead
                    ? "(min-width:1024px) 66vw, 100vw"
                    : "(min-width:768px) 33vw, 100vw"
                }
                className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent" />

              {/* Top Index Pill */}
              <span className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                <span className="border border-white/20 bg-ink/40 px-3 py-1 font-display text-xs italic tracking-[0.18em] text-gold-soft backdrop-blur-sm">
                  0{idx + 1}
                </span>
                <span className="flex size-8 items-center justify-center border border-white/20 bg-ink/30 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-gold-soft group-hover:bg-gold-soft group-hover:text-ink">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </span>

              {/* Overlay Title & Description */}
              <span className="absolute inset-x-0 bottom-0 p-6">
                <span className="block text-[9.5px] font-semibold uppercase tracking-[0.26em] text-gold-soft">
                  {locale === "ar" ? "ركن العطور" : "Olfactory Chapter"}
                </span>
                <span className="mt-1.5 block font-display text-2xl leading-tight text-cream md:text-3xl">
                  {tx(c.title, c.titleAr, locale)}
                </span>
                {(c.descriptionAr || c.description) && (
                  <span className="mt-2 line-clamp-2 max-w-lg text-[12.5px] leading-relaxed text-cream/80">
                    {tx(c.description ?? "", c.descriptionAr, locale)}
                  </span>
                )}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function ShopByBrands({
  categories,
  locale,
  eyebrow = "Maisons",
  title = "Shop By Brands",
}: {
  categories: Category[];
  locale: Locale;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {categories.slice(0, 3).map((c) => (
          <Link
            key={c.slug}
            href={`/collection/${c.slug}`}
            className="group relative block overflow-hidden border border-ink/10"
          >
            <span className="relative block aspect-[16/10] bg-sand">
              <Image
                src={c.image}
                alt={tx(c.title, c.titleAr, locale)}
                fill
                sizes="(min-width:768px) 33vw, 100vw"
                className="object-cover transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
              />
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4 pt-10 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-white">
              {tx(c.title, c.titleAr, locale)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
