import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * On-demand revalidation that actually busts the production cache.
 *
 * next-intl `localePrefix: "as-needed"` serves default-locale (EN) pages at
 * clean URLs through an INTERNAL rewrite to `/en/…`. Next.js keys its Full
 * Route Cache on the rewritten destination path (Next docs: "Using
 * revalidatePath with rewrites"), so revalidating only the public path
 * (`/product/x`, `/`) silently misses the EN cache entry — edits then look
 * "stuck" in production until the next deploy, while local dev (no route
 * cache) looks fine after the router cache expires. AR URLs already carry
 * their prefix, so no rewrite happens there.
 *
 * Rule: every storefront surface is revalidated as a triple —
 * public + `/en` + `/ar`. Server-only: import from Server Actions /
 * Route Handlers, never from client components.
 */

/** Any storefront path (unprefixed, e.g. `/blog/x`) as a locale triple. */
export function revalidatePagePaths(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  for (const p of [clean, `/en${clean}`, `/ar${clean}`]) revalidatePath(p, "page");
}

export function revalidateHome() {
  revalidatePagePaths("/find-your-scent");
  revalidateNavigation();
  for (const p of ["/", "/en", "/ar"]) revalidatePath(p, "page");
}

export function revalidateProductPaths(slug: string) {
  for (const p of [`/product/${slug}`, `/en/product/${slug}`, `/ar/product/${slug}`]) {
    revalidatePath(p, "page");
  }
}

export function revalidateCollectionPaths(slugs: Iterable<string>) {
  for (const c of new Set(slugs)) {
    if (!c) continue;
    for (const p of [`/collection/${c}`, `/en/collection/${c}`, `/ar/collection/${c}`]) {
      revalidatePath(p, "page");
    }
  }
}

/** PDP + every collection listing it + home, after any product mutation. */
export async function touchProduct(supabase: SupabaseClient, productId: string) {
  const { data: prod } = await supabase.from("products").select("slug").eq("id", productId).single();
  const slug = (prod as { slug?: string } | null)?.slug;
  if (slug) revalidateProductPaths(slug);
  const { data: links } = await supabase
    .from("product_collections")
    .select("collection_id")
    .eq("product_id", productId);
  const ids = (((links as { collection_id: string }[] | null) ?? []).map((r) => r.collection_id));
  if (ids.length) {
    const { data: cols } = await supabase.from("collections").select("slug").in("id", ids);
    revalidateCollectionPaths((((cols as { slug: string }[] | null) ?? []).map((c) => c.slug)));
  }
  revalidateHome();
}

/** Extract a `products`-bucket storage path from a public URL (null for
    local `/products/*` fallbacks and anything else — never delete those). */
const PRODUCTS_MARKER = "/storage/v1/object/public/products/";

export function productsBucketPath(url: string): string | null {
  const i = url.indexOf(PRODUCTS_MARKER);
  if (i === -1) return null;
  const path = url
    .slice(i + PRODUCTS_MARKER.length)
    .split("?")[0]
    ?.trim();
  return path ? path : null;
}

/** Header content appears on every storefront route. */
export function revalidateNavigation() {
  for (const path of ["/", "/en", "/ar"]) revalidatePath(path, "layout");
}
