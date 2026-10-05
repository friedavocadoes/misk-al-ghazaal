"use client";

import Link from "next/link";
import type { Banner } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";

// Split promo banners — converted from Ishi_galleryblock.liquid
// (gallery_image blocks) + Ishi_manufactureblock.liquid (logo_image row).
export function BannerSplit({ banners }: { banners: Banner[] }) {
  return (
    <section aria-label="Shop by brand" className="mx-auto max-w-7xl px-4 py-10">
      <h2 className="mb-6 text-2xl font-bold text-stone-900">Shop By Brands</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {banners.map((b) => (
          <Link
            key={b.src}
            href={b.href ?? "/collections"}
            className="group relative overflow-hidden rounded-3xl"
          >
            <SafeImage
              src={b.src}
              fallback={b.fallback}
              alt={b.alt}
              width={800}
              height={450}
              className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {b.title && (
              <span className="absolute bottom-0 p-5 text-xl font-bold text-white">
                {b.title}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
