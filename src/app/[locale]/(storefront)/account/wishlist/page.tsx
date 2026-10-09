"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Heart } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const t = useTranslations("Account");
  const { ids, userId } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      if (!userId) {
        if (live) setProducts(null);
        return;
      }
      if (!ids.length) {
        if (live) setProducts([]);
        return;
      }
      try {
        const r = await fetch(`/api/products?slugs=${encodeURIComponent(ids.join(","))}`);
        const j = (await (r.ok ? r.json() : null)) as {
          products?: { slug: string; title: string; title_ar?: string; price: number; images?: string[] }[];
        } | null;
        if (!live) return;
        setProducts(
          (j?.products ?? []).map((p) => ({
            id: p.slug,
            slug: p.slug,
            title: p.title,
            ...(p.title_ar ? { titleAr: p.title_ar } : {}),
            descriptionHtml: "",
            price: Number(p.price),
            images: p.images ?? [],
            categorySlugs: [],
            tags: [],
            rating: 0,
            reviewCount: 0,
            variants: [],
            notes: [],
          })),
        );
      } catch {
        if (live) setProducts([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [ids, userId]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
      <Link href="/account" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-fog transition hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("backToAccount")}
      </Link>
      <p className="eyebrow mt-4 flex items-center gap-2 text-gold">
        <Heart className="size-4" /> {t("wishlistEyebrow")}
      </p>
      <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">{t("wishlistTitle")}</h1>

      {!userId ? (
        <div className="mx-auto mt-8 max-w-md text-center">
          <p className="text-sm text-espresso">{t("wishlistLogin")}</p>
          <Link
            href="/account/login?next=/account/wishlist"
            className="mt-5 inline-block bg-ink px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gold-soft hover:text-ink"
          >
            {t("login")}
          </Link>
        </div>
      ) : products === null ? (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-sand" />
              <div className="mx-auto mt-3 h-4 w-2/3 bg-ink/10" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="mt-8 border border-dashed border-ink/20 p-8 text-center font-display text-xl text-ink">
          {t("wishlistEmpty")}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
