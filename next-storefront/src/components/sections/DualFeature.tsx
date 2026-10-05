import Link from "next/link";
import Image from "next/image";

// Dual editorial panels: the maison's own line vs. manufacturing for others.
export function DualFeature() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-4 md:px-8">
      <div className="grid gap-1 md:grid-cols-2">
        <Link href="/collection/misk-al-ghazaal" className="group relative block overflow-hidden">
          <span className="relative block aspect-[16/11]">
            <Image
              src="/products/misk-al-ghazaal-abukhalid-50ml-1.jpg"
              alt="The Misk Al Ghazaal maison line"
              fill
              sizes="(min-width:768px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          </span>
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-7">
            <span className="eyebrow text-gold-soft">Our Lineup</span>
            <span className="mt-2 block font-display text-3xl text-white">
              The Maison Collection
            </span>
            <span className="link-underline mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
              Shop the Line
            </span>
          </span>
        </Link>
        <Link href="/manufacture" className="group relative block overflow-hidden">
          <span className="relative block aspect-[16/11]">
            <Image
              src="/products/classic-oud-1.jpg"
              alt="Manufacturing for private labels"
              fill
              sizes="(min-width:768px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          </span>
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-7">
            <span className="eyebrow text-gold-soft">For Partners</span>
            <span className="mt-2 block font-display text-3xl text-white">
              We Manufacture For You
            </span>
            <span className="link-underline mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
              Start Manufacturing
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
