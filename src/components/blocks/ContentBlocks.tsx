"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Star } from "lucide-react";
import type { Article, Product } from "@/lib/types";
import type { Testimonial } from "@/lib/site";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "./ProductCarousel";

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
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {articles.map((a) => (
        <Link key={a.slug} href={`/blog/${a.slug}`} className="group">
          <span className="relative block aspect-[16/10] overflow-hidden bg-sand">
            <Image
              src={a.image}
              alt={a.title}
              fill
              sizes="(min-width:768px) 33vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          </span>
          <span className="block pt-4">
            <span className="block text-[11px] uppercase tracking-[0.2em] text-fog">
              {a.date}
            </span>
            <span className="mt-1.5 block font-display text-xl leading-snug text-ink group-hover:text-gold">
              {a.title}
            </span>
            <span className="mt-1.5 block text-[13px] text-espresso">{a.excerpt}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <section className="border-y border-ink/10 bg-sand/50 py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="eyebrow text-gold">Client Words</p>
        <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">
          Worn Across the Emirates
        </h2>
        <div className="mt-10 grid gap-px border border-ink/10 bg-ink/10 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.name} className="bg-cream p-8">
              <div className="flex gap-1" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className="mt-4 font-display text-lg italic leading-relaxed text-ink">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
                {t.name} · {t.meta}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InstagramFeed() {
  const shots = [
    "/products/noorjes-imagine-1.jpg",
    "/products/dukhoonak-big-boss-1.jpg",
    "/products/misk-al-ghazaal-abukhalid-50ml-1.jpg",
    "/products/jawhara-from-misk-al-ghazal-bakhoor-tablets-arabic-insence-1.jpg",
    "/products/gazaal-my-wish-edp-100ml-1.jpg",
    "/products/classic-oud-1.jpg",
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading eyebrow="@misk.al.ghazaal" title="Follow the Ritual" />
      <div className="grid grid-cols-3 gap-1 md:grid-cols-6">
        {shots.map((src) => (
          <span key={src} className="relative block aspect-square overflow-hidden bg-sand">
            <Image
              src={src}
              alt="Misk Al Ghazaal ritual"
              fill
              sizes="200px"
              className="object-cover"
            />
          </span>
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

export function ParallaxCTA() {
  return (
    <section className="relative overflow-hidden bg-ink">
      <span className="relative block h-[320px] md:h-[380px]">
        <Image
          src="/products/dukhoonak-big-boss-1.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-35"
        />
      </span>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        <p className="eyebrow text-gold-soft">The Icons</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl text-white md:text-5xl">
          Best-selling perfumes & bakhoors
        </h2>
        <Link
          href="/collection/best-sellers"
          className="link-underline mt-6 text-[12px] font-semibold uppercase tracking-[0.22em] text-white"
        >
          Shop Best Sellers
        </Link>
      </div>
    </section>
  );
}
