"use client";

import { Link } from "@/i18n/navigation";
import type { Banner } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";

// Split promo banners — converted from Ishi_galleryblock.liquid
// (gallery_image blocks) + Ishi_manufactureblock.liquid (logo_image row).
export function BannerSplit({ banners }: { banners: Banner[] }) {
  return (
    <section aria-label="Shop by brand" className="mx-auto max-w-7xl px-5 py-6 md:px-8">
      <div className="grid gap-1 md:grid-cols-3">
        {banners.map((b) => (
          <Link
            key={b.src}
            href={b.href ?? "/collections"}
            className="group relative block overflow-hidden"
          >
            <SafeImage
              src={b.src}
              fallback={b.fallback}
              alt={b.alt}
              width={800}
              height={500}
              className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
            {b.title && (
              <span className="absolute inset-x-0 bottom-0 p-5">
                <span className="block font-display text-xl italic text-white">
                  {b.title}
                </span>
                <span className="link-underline mt-1 inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85">
                  Discover
                </span>
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
