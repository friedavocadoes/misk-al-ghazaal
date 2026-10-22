import { NextResponse } from "next/server";
import { getProductsByCollection, searchCatalog, type CatalogQuery } from "@/lib/store";
import type { Product } from "@/lib/types";

function toCard(p: Product) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    ...(p.titleAr ? { titleAr: p.titleAr } : {}),
    descriptionHtml: "",
    price: p.price,
    ...(p.compareAtPrice != null ? { compareAtPrice: p.compareAtPrice } : {}),
    images: p.images,
    categorySlugs: p.categorySlugs,
    tags: [],
    rating: p.rating,
    reviewCount: p.reviewCount,
    variants: p.variants,
    notes: p.notes,
    outOfStock: p.outOfStock,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    lineupTitle: p.lineupTitle,
    lineupTitleAr: p.lineupTitleAr,
  };
}

/** GET /api/catalog — one paged engine for every listing surface.
    collection=… (or "all") | q=… + sort/min/max/avail/sale/rating +
    offset/limit. Powers infinite scroll (no pagination anywhere). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const num = (k: string): number | null => {
    const v = sp.get(k);
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const opts: CatalogQuery = {
    sort: sp.get("sort"),
    maxPrice: num("max"),
    minPrice: num("min"),
    inStockOnly: sp.get("avail") === "in",
    onSaleOnly: sp.get("sale") === "1",
    minRating: num("rating"),
    lineup: sp.get("lineup"),
    ritual: sp.get("ritual"),
    note: sp.get("note"),
  };
  const offset = Math.max(0, num("offset") ?? 0);
  const limit = Math.min(24, Math.max(1, num("limit") ?? 12));
  try {
    const collection = sp.get("collection");
    const q = sp.get("q") ?? "";
    const all = collection
      ? await getProductsByCollection(collection, opts)
      : await searchCatalog(q, opts);
    const slice = all.slice(offset, offset + limit);
    return NextResponse.json({
      products: slice.map(toCard),
      total: all.length,
      hasMore: offset + limit < all.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "catalog failed" },
      { status: 500 },
    );
  }
}
