import Link from "next/link";
import type { Category } from "@/lib/types";
import { SectionHeading } from "./ProductCarousel";

export function CategoryTiles({ categories }: { categories: Category[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionHeading eyebrow="" title="Our Products" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.slice(0, 4).map((c) => (
          <Link
            key={c.slug}
            href={`/collection/${c.slug}`}
            className="group overflow-hidden rounded-2xl border border-stone-100 bg-white"
          >
            <span className="block aspect-[4/3] overflow-hidden bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt={c.title}
                className="size-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </span>
            <span className="block p-4 text-center text-sm font-semibold text-stone-900">
              {c.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CollectionGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/collection/${c.slug}`}
          className="group overflow-hidden rounded-2xl border border-stone-100 bg-white"
        >
          <span className="block aspect-square overflow-hidden bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.image}
              alt={c.title}
              className="size-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </span>
          <span className="block p-4">
            <span className="block font-semibold text-stone-900">{c.title}</span>
            {c.description && (
              <span className="mt-1 block text-sm text-stone-500">
                {c.description}
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ShopByBrands({ categories }: { categories: Category[] }) {
  return (
    <section className="border-y border-stone-100 bg-stone-50/60 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <SectionHeading eyebrow="" title="Shop By Brands" />
        <div className="grid grid-cols-3 gap-4">
          {categories.slice(0, 3).map((c) => (
            <Link
              key={c.slug}
              href={`/collection/${c.slug}`}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt={c.title}
                className="aspect-[16/9] w-full object-cover"
                loading="lazy"
              />
              <span className="block p-3 text-center text-sm font-semibold">
                {c.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
