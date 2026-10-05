import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Converted from sections/Ishi_storyblock.liquid — brand story + CTA.
export function StoryBlock() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-stone-50 p-6 md:grid-cols-2 md:p-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <Image
            src="/products/misk-al-ghazaal-abukhalid-50ml-1.jpg"
            alt="Misk Al Ghazaal — our story"
            fill
            sizes="(min-width:768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
            Our story
          </p>
          <h2 className="mt-2 text-3xl font-bold text-stone-900">
            From manufacturer to your majlis
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Gazaal brings Misk Al Ghazaal perfumes, dukhoon and holy oudh
            direct from the source — no middlemen, no compromises. Every batch
            is sealed at origin and delivered across the UAE with free samples
            in every order.
          </p>
          <Button asChild className="mt-6">
            <Link href="/about">Read Our Story</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
