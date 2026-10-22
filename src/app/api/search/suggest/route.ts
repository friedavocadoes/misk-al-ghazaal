import { NextResponse } from "next/server";
import { suggestProducts } from "@/lib/store";
import { getAdminSession } from "@/lib/admin-auth";

export type SuggestItem = Omit<import("@/lib/search-index").SearchDocument,"keywords">;

/** GET /api/search/suggest?q=…&limit=8[&scope=admin] — live autocomplete.
    Searches a short-lived, mutation-invalidated catalog index. `scope=admin`
    (staff only) also surfaces paused products for the console quick-find. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") ?? "";
  const limit = Math.min(10, Math.max(1, Number(sp.get("limit")) || 8));
  try {
    let includeInactive = false;
    if (sp.get("scope") === "admin") {
      const s = await getAdminSession();
      if (!s || s.role !== "super_admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      includeInactive = true;
    }
    const items = await suggestProducts(q, limit, { includeInactive });
    return NextResponse.json({
      items: items.map(
        (p): SuggestItem => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          ...(p.titleAr ? { titleAr: p.titleAr } : {}),
          ...(p.images[0] ? { image: p.images[0] } : {}),
          price: p.price,
          ...(p.compareAtPrice != null ? { compareAtPrice: p.compareAtPrice } : {}),
          ...(p.lineupTitle ? { lineupTitle: p.lineupTitle } : {}),
          ...(p.lineupTitleAr ? { lineupTitleAr: p.lineupTitleAr } : {}),
          outOfStock:p.outOfStock || !p.variants.some(v=>v.stock>0),
          rating: p.rating,
          reviewCount: p.reviewCount,
          ...(p.isNew ? { isNew: true } : {}),
          ...(p.isBestSeller ? { isBestSeller: true } : {}),
          ...(p.isActive === false ? { isActive: false } : {}),
          variantCount: p.variants.length,
          ...(p.variants[0] ? { firstVariant: p.variants[0].title } : {}),
          topNotes: p.notes
            .filter((n) => n.kind === "top")
            .slice(0, 2)
            .map((n) => ({ name: n.name, ...(n.nameAr ? { nameAr: n.nameAr } : {}) })),
        }),
      ),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "suggest failed" },
      { status: 500 },
    );
  }
}
