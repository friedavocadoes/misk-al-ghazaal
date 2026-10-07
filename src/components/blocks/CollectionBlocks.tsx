import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Category } from "@/lib/types";
import { SectionHeading } from "./ProductCarousel";

export function CategoryTiles({ categories }: { categories: Category[] }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading eyebrow="The Library" title="Shop by Ritual" />
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {categories.slice(0, 4).map((c) => (
          <Link key={c.slug} href={`/collection/${c.slug}`} className="group">
            <span className="relative block aspect-[3/4] overflow-hidden bg-sand">
              <Image
                src={c.image}
                alt={c.title}
                fill
                sizes="(min-width:1024px) 25vw, 50vw"
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-10">
                <span className="block font-display text-lg italic text-white">
                  {c.title}
                </span>
                <span className="link-underline mt-1 inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
                  Discover
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CollectionGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
      {categories.map((c) => (
        <Link key={c.slug} href={`/collection/${c.slug}`} className="group">
          <span className="relative block aspect-[4/5] overflow-hidden bg-sand">
            <Image
              src={c.image}
              alt={c.title}
              fill
              sizes="(min-width:768px) 33vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          </span>
          <span className="block pt-3">
            <span className="block font-display text-lg text-ink group-hover:text-gold">
              {c.title}
            </span>
            {c.description && (
              <span className="mt-0.5 block text-[13px] text-fog">
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
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <SectionHeading eyebrow="Maisons" title="Shop By Brands" />
      <div className="grid grid-cols-3 gap-1">
        {categories.slice(0, 3).map((c) => (
          <Link
            key={c.slug}
            href={`/collection/${c.slug}`}
            className="group relative block overflow-hidden"
          >
            <span className="relative block aspect-[16/10] bg-sand">
              <Image
                src={c.image}
                alt={c.title}
                fill
                sizes="(min-width:768px) 33vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-[1.04]"
              />
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 pt-8 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-white">
              {c.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
