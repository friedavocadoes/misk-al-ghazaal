"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowUpRight, Quote, Star } from "lucide-react";
import type { Article, Product } from "@/lib/types";
import type { Testimonial } from "@/lib/site";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "./ProductCarousel";
import { INSTAGRAM_URL, PARALLAX_SECTION_DEFAULTS } from "@/lib/site";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion
      type="single"
      collapsible
      className="border border-ink/10 bg-white px-6"
    >
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function BlogCardGrid({ articles }: { articles: Article[] }) {
  const locale = (useLocale() === "ar" ? "ar" : "en") as Locale;
  const articleEditorialArt = [
    "/banners/hero-big-boss-dukhoon.jpg",
    "/banners/hero-misk-signature.jpg",
    "/banners/brand-holy-oudh.jpg",
  ];
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {articles.map((a, idx) => {
        const imgSrc =
          a.image === "/theme-assets/comment-blog.jpg"
            ? (articleEditorialArt[idx % articleEditorialArt.length] ?? a.image)
            : a.image;
        return (
          <Link
            key={a.slug}
            href={`/blog/${a.slug}`}
            className="group flex flex-col border border-ink/10 bg-cream/60 transition-colors duration-500 hover:border-gold/50"
          >
            <span className="relative block aspect-[16/10] overflow-hidden bg-sand">
              <Image
                src={imgSrc}
                alt={tx(a.title, a.titleAr, locale)}
                fill
                sizes="(min-width:768px) 33vw, 100vw"
                className="object-cover transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
              />
              <span className="absolute left-4 top-4 border border-white/20 bg-ink/50 px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-gold-wash backdrop-blur-sm">
                0{idx + 1} · {a.date}
              </span>
            </span>
            <span className="flex flex-1 flex-col justify-between p-6">
              <span>
                <span className="block font-display text-xl leading-snug text-ink transition-colors group-hover:text-gold">
                  {tx(a.title, a.titleAr, locale)}
                </span>
                <span className="mt-2.5 block text-[13px] leading-relaxed text-espresso">
                  {tx(a.excerpt, a.excerptAr, locale)}
                </span>
              </span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink group-hover:text-gold">
                <span>
                  {locale === "ar" ? "اقرأ المقال" : "Read Essay"}
                </span>
                <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function Testimonials({
  items,
  eyebrow,
  title,
}: {
  items: Testimonial[];
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="border-y border-ink/10 bg-sand/50 py-18 md:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mb-12 text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-gold">
            <span className="inline-block h-px w-8 bg-gold/60" />
            {eyebrow}
            <span className="inline-block h-px w-8 bg-gold/60" />
          </p>
          <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
            {title}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t, idx) => (
            <figure
              key={t.name + idx}
              className="relative flex flex-col justify-between border border-ink/10 bg-cream p-8 transition-colors duration-500 hover:border-gold/45"
            >
              <Quote
                aria-hidden
                className="absolute right-6 top-6 size-9 text-gold/15 rtl:left-6 rtl:right-auto"
              />
              <div>
                <div className="flex gap-1" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-gold text-gold" />
                  ))}
                </div>
                <blockquote className="mt-5 font-display text-lg italic leading-relaxed text-ink">
                  “{t.text}”
                </blockquote>
              </div>
              <figcaption className="mt-6 border-t border-ink/10 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
                <span className="text-ink">{t.name}</span> · {t.meta}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InstagramFeed({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const shots = [
    "/banners/hero-misk-signature.jpg",
    "/products/noorjes-imagine-1.jpg",
    "/banners/hero-big-boss-dukhoon.jpg",
    "/products/jawahara-from-misk-al-ghazal-bakhoor-tablets-arabic-insence-1.jpg",
    "/banners/brand-holy-oudh.jpg",
    "/products/misk-al-ghazaal-abukhalid-50ml-1.jpg",
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-22">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        link={{ label: "@misk.al.ghazaal", href: INSTAGRAM_URL }}
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
        {shots.map((src, idx) => (
          <a
            key={src + idx}
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="group relative block aspect-square overflow-hidden border border-ink/10 bg-sand"
          >
            <Image
              src={src}
              alt="Misk Al Ghazaal ritual"
              fill
              sizes="(min-width:768px) 16vw, 50vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <ArrowUpRight className="size-5 text-cream" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function WishlistGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.slice(0, 4).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ParallaxCTA({
  eyebrow,
  title,
  cta,
  src,
  href,
}: {
  eyebrow: string;
  title: string;
  cta: string;
  src?: string;
  href?: string;
}) {
  const imageSrc = src || PARALLAX_SECTION_DEFAULTS.image;
  const linkHref = href || PARALLAX_SECTION_DEFAULTS.href;

  return (
    <section className="relative overflow-hidden border-y border-gold-soft/25 bg-ink">
      <span className="relative block h-[380px] md:h-[460px]">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="100vw"
          className="object-cover opacity-55"
        />
      </span>
      <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/60" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-5 border border-gold-soft/30 md:inset-8"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {eyebrow && (
          <p className="eyebrow flex items-center gap-3 text-gold-soft">
            <span className="inline-block h-px w-8 bg-gold-soft" />
            {eyebrow}
            <span className="inline-block h-px w-8 bg-gold-soft" />
          </p>
        )}
        {title && (
          <h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight text-cream md:text-5xl lg:text-6xl">
            {title}
          </h2>
        )}
        {cta && (
          <Link
            href={linkHref}
            className="group mt-8 inline-flex items-center gap-2.5 border border-gold-soft/60 bg-cream px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink transition-all duration-300 hover:bg-gold-wash"
          >
            <span>{cta}</span>
            <ArrowUpRight className="size-3.5 text-gold transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
