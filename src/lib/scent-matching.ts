import type { Product } from "@/lib/types";
export type ScentAudience = "men" | "women" | "unisex";
/** Audience is inferred only from explicit catalog collections/tags, never a perfume name. */
export function audienceMatches(product: Product, audience: ScentAudience) {
  const labels = new Set([...product.categorySlugs, ...product.tags].map(v => v.toLowerCase().trim()));
  const men = ["for-him", "men", "mens", "male"].some(v => labels.has(v));
  const women = ["for-her", "women", "womens", "female"].some(v => labels.has(v));
  const unisex = labels.has("unisex") || (men && women);
  return audience === "unisex" ? unisex : unisex || (audience === "men" ? men : women);
}
export function rankScents(products: Product[], audience: ScentAudience, selected: string[]) {
  const wanted = [...new Set(selected.map(s => s.toLowerCase()))];
  return products.filter(p => p.isActive !== false).map(product => {
    const hits = wanted.filter(slug => product.notes.some(n => n.slug.toLowerCase() === slug));
    const audienceMatch = audienceMatches(product, audience);
    // Prefer matching notes within the requested audience, then genuine overlaps outside it,
    // then audience-only alternatives. No invented match percentages.
    const tier = hits.length ? (audienceMatch ? 3 : 2) : audienceMatch ? 1 : 0;
    return { product, hits, audienceMatch, tier };
  }).sort((a,b) => b.tier - a.tier || b.hits.length - a.hits.length || Number(b.product.variants.some(v => v.stock > 0)) - Number(a.product.variants.some(v => v.stock > 0)) || (a.product.sortRank ?? 0) - (b.product.sortRank ?? 0) || a.product.slug.localeCompare(b.product.slug)).slice(0,6);
}
const PALETTE = ["#a994b5", "#b29a74", "#71969c", "#b78d98", "#8c9d82", "#c4a174"];
export function noteTint(name: string) {
  const key = name.toLowerCase();
  if (/oud|wood|bakhoor|smoke/.test(key)) return "#a98d71";
  if (/rose|floral|flower/.test(key)) return "#c399a4";
  if (/citrus|lemon|orange|bergamot/.test(key)) return "#c7b87b";
  if (/aquatic|marine|sea/.test(key)) return "#80a6ac";
  if (/amber|saffron|vanilla/.test(key)) return "#c5a06f";
  if (/musk|powder/.test(key)) return "#b2a2bd";
  let hash = 0; for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
