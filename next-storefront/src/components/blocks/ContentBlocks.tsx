"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { Article, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "./ProductCard";
import { SectionHeading } from "./ProductCarousel";

export function FaqAccordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  return (
    <Accordion type="single" collapsible className="rounded-3xl border border-stone-200 px-6">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function ContactBlocks() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl bg-emerald-950 p-8 text-white">
        <h2 className="text-2xl font-bold">Get In Touch</h2>
        <p className="mt-2 text-sm text-emerald-100/80">
          We&apos;d love to hear from you. Open Mon–Sat, 10AM–5PM.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          <li><strong>Address:</strong> Mamzar Centre, Dubai, UAE</li>
          <li><strong>Phone:</strong> +971 4 000 0000</li>
          <li><strong>Email:</strong> gazaalperfumes@gmail.com</li>
        </ul>
      </div>
      <form
        className="rounded-3xl border border-stone-200 p-8"
        onSubmit={(e) => e.preventDefault()}
      >
        <h2 className="text-xl font-bold">Leave us a message</h2>
        <div className="mt-4 grid gap-3">
          <Input placeholder="Name" required />
          <Input placeholder="Email" type="email" required />
          <Input placeholder="Subject" />
          <textarea
            placeholder="Message"
            rows={4}
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm"
          />
          <Button type="submit">Send Message</Button>
        </div>
      </form>
    </div>
  );
}

export function BlogCardGrid({ articles }: { articles: Article[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {articles.map((a) => (
        <Link
          key={a.slug}
          href={`/blog/${a.slug}`}
          className="group overflow-hidden rounded-2xl border border-stone-100 bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.image}
            alt={a.title}
            className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <span className="block p-4">
            <span className="block text-xs text-stone-400">{a.date}</span>
            <span className="mt-1 block font-semibold">{a.title}</span>
            <span className="mt-1 block text-sm text-stone-500">{a.excerpt}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function Testimonials() {
  const items = [
    { name: "Ayesha K.", text: "Misk Al Ghazaal lasts the entire day. Truly authentic." },
    { name: "Omar S.", text: "Big Boss dhukhoon fills the whole majlis in minutes." },
    { name: "Fatima R.", text: "Fast delivery in Dubai and beautiful packaging." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeading eyebrow="Reviews" title="Loved across the UAE" />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.name} className="rounded-2xl border border-stone-100 bg-white p-6">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <blockquote className="mt-3 text-sm text-stone-700">“{t.text}”</blockquote>
            <figcaption className="mt-3 text-xs font-semibold text-stone-500">
              {t.name} · Verified buyer
            </figcaption>
          </figure>
        ))}
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
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeading eyebrow="@gazaal.perfumes" title="Follow the Ritual" />
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {shots.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt="Instagram post"
            className="aspect-square w-full rounded-xl object-cover"
            loading="lazy"
          />
        ))}
      </div>
    </section>
  );
}

export function WishlistGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.slice(0, 4).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ParallaxCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 px-6 py-14 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/products/dukhoonak-big-boss-1.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover opacity-40"
          loading="lazy"
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Best sellers
          </p>
          <h2 className="mx-auto mt-2 max-w-lg text-3xl font-bold text-white">
            Best-selling perfumes & bakhoors from Misk Al Ghazaal
          </h2>
          <Button asChild variant="gold" className="mt-6">
            <Link href="/collection/best-sellers">Shop Best Sellers</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
