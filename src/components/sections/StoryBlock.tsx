import Image from "next/image";
import Link from "next/link";

// Converted from sections/Ishi_storyblock.liquid — brand story + CTA.
export function StoryBlock() {
  return (
    <section className="border-y border-ink/10 bg-sand/50">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div className="relative aspect-[4/3] overflow-hidden bg-linen">
          <Image
            src="/products/misk-al-ghazaal-abukhalid-50ml-1.jpg"
            alt="Misk Al Ghazaal — our story"
            fill
            sizes="(min-width:768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="eyebrow text-gold">Our Story</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink md:text-[2.75rem]">
            From manufacturer to your majlis
          </h2>
          <span className="mt-4 block h-px w-12 bg-gold-soft" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-espresso">
            Misk Al Ghazaal crafts its own perfume maison line and manufactures
            for select partners — no middlemen, no compromises. Every batch
            is sealed at origin and delivered across the UAE with complimentary
            samples in every order.
          </p>
          <Link
            href="/pages/about"
            className="link-underline mt-6 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink"
          >
            Read Our Story
          </Link>
        </div>
      </div>
    </section>
  );
}
