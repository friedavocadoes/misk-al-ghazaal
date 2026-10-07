// ---------------------------------------------------------------------------
// Database-backed data-access layer (Supabase is the ONLY source of truth).
//
// Pages and blocks must import from here — never query Supabase directly.
// Every getter throws when Supabase env is missing or a query fails, so a
// misconfigured deploy fails loudly instead of serving stale mock data.
// ---------------------------------------------------------------------------

import type { Article, Banner, Category, Product, Variant } from "./types";
// Public (cookie-free) client: storefront reads are anonymous and must work
// in generateStaticParams. Staff-scoped reads live in admin pages via
// supabase/server (cookie session) instead.
import { createPublicClient as createClient } from "./supabase/public";
import { isSupabaseConfigured } from "./supabase/keys";

export type ProductListItem = Product;
export type CollectionListItem = Category;

function requireConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). " +
        "See SETUP_SUPABASE.md.",
    );
  }
}

interface DbProduct {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description_html: string;
  description_ar: string | null;
  price: number;
  compare_at: number | null;
  images: string[];
  rating: number;
  review_count: number;
  featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  template: "standard" | "miskalgazaal";
}

interface DbVariant {
  id: string;
  product_id: string;
  title: string;
  price: number;
  stock: number;
  sku: string | null;
}

function toProduct(p: DbProduct, variants: DbVariant[], slugs: string[]): Product {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    ...(p.title_ar ? { titleAr: p.title_ar } : {}),
    descriptionHtml: p.description_html,
    ...(p.description_ar ? { descriptionAr: p.description_ar } : {}),
    price: Number(p.price),
    ...(p.compare_at != null ? { compareAtPrice: Number(p.compare_at) } : {}),
    images: p.images ?? [],
    categorySlugs: slugs,
    tags: slugs,
    rating: Number(p.rating ?? 0),
    reviewCount: p.review_count ?? 0,
    variants: variants.map(
      (v): Variant => ({
        id: v.id,
        title: v.title,
        price: Number(v.price),
        stock: v.stock,
        ...(v.sku ? { sku: v.sku } : {}),
      }),
    ),
    ...(p.featured ? { featured: true } : {}),
    ...(p.is_new ? { isNew: true } : {}),
    ...(p.is_best_seller ? { isBestSeller: true } : {}),
    template: p.template ?? "standard",
  };
}

async function fetchProductsWithRelations(filter?: {
  slugs?: string[];
  collectionId?: string;
}): Promise<Product[]> {
  requireConfigured();
  const supabase = await createClient();
  // Bin is invisible to shoppers: soft-deleted rows never leave the DB layer.
  let pq = supabase.from("products").select("*").is("deleted_at", null);
  if (filter?.slugs?.length) pq = pq.in("slug", filter.slugs);
  const { data: prods, error } = await pq;
  if (error || !prods) throw error ?? new Error("products query failed");
  const ids = (prods as DbProduct[]).map((p) => p.id);

  const variantMap = new Map<string, DbVariant[]>();
  if (ids.length) {
    const { data: vars } = await supabase
      .from("variants")
      .select("*")
      .in("product_id", ids);
    for (const v of (vars as DbVariant[]) ?? []) {
      const arr = variantMap.get(v.product_id) ?? [];
      arr.push(v);
      variantMap.set(v.product_id, arr);
    }
  }

  const slugMap = new Map<string, string[]>();
  if (ids.length) {
    const { data: links } = await supabase
      .from("product_collections")
      .select("product_id, collections!inner(slug)")
      .in("product_id", ids);
    const rows = (links ?? []) as unknown as {
      product_id: string;
      collections: { slug: string } | { slug: string }[];
    }[];
    for (const l of rows) {
      const slug = Array.isArray(l.collections)
        ? l.collections[0]?.slug
        : l.collections?.slug;
      if (!slug) continue;
      const arr = slugMap.get(l.product_id) ?? [];
      arr.push(slug);
      slugMap.set(l.product_id, arr);
    }
  }

  let list = (prods as DbProduct[]).map((p) =>
    toProduct(p, variantMap.get(p.id) ?? [], slugMap.get(p.id) ?? []),
  );
  if (filter?.collectionId) {
    const { data: scoped } = await supabase
      .from("product_collections")
      .select("product_id")
      .eq("collection_id", filter.collectionId);
    const keep = new Set((scoped ?? []).map((s: { product_id: string }) => s.product_id));
    list = list.filter((p) => keep.has(p.id));
  }
  return list;
}

export async function getProducts(): Promise<Product[]> {
  return fetchProductsWithRelations();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const list = await fetchProductsWithRelations({ slugs: [slug] });
  return list[0] ?? null;
}

// best-sellers / new-arrivals stay flag-derived (admin toggles flags in
// /admin/products); every other collection resolves via product_collections.
const FLAG_COLLECTIONS = new Set(["best-sellers", "new-arrivals"]);

export async function getProductsByCollection(
  slug: string,
  opts?: { sort?: string | null; maxPrice?: number | null; inStockOnly?: boolean },
): Promise<Product[]> {
  requireConfigured();
  let items: Product[];
  if (FLAG_COLLECTIONS.has(slug)) {
    const all = await fetchProductsWithRelations();
    items = all.filter((p) =>
      slug === "best-sellers" ? p.isBestSeller : p.isNew,
    );
  } else {
    const supabase = await createClient();
    const { data: coll } = await supabase
      .from("collections")
      .select("id")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();
    if (!coll) return [];
    items = await fetchProductsWithRelations({
      collectionId: (coll as { id: string }).id,
    });
  }
  if (opts?.inStockOnly) {
    items = items.filter((p) => p.variants.some((v) => v.stock > 0));
  }
  if (opts?.maxPrice != null) {
    items = items.filter((p) => p.price <= (opts.maxPrice as number));
  }
  if (opts?.sort === "price-asc") items = [...items].sort((a, b) => a.price - b.price);
  if (opts?.sort === "price-desc") items = [...items].sort((a, b) => b.price - a.price);
  if (opts?.sort === "rating") items = [...items].sort((a, b) => b.rating - a.rating);
  return items;
}

function toCategory(c: {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  image: string;
  description: string | null;
  description_ar: string | null;
}): Category {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    ...(c.title_ar ? { titleAr: c.title_ar } : {}),
    image: c.image,
    ...(c.description ? { description: c.description } : {}),
    ...(c.description_ar ? { descriptionAr: c.description_ar } : {}),
  };
}

export async function getCollections(): Promise<Category[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
      .from("collections")
      .select("*")
      .is("deleted_at", null)
      .order("sort");
  if (error || !data) throw error ?? new Error("collections failed");
  return data.map(toCategory);
}

export async function getCollectionBySlug(slug: string): Promise<Category | null> {
  requireConfigured();
  const supabase = await createClient();
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();
  if (error || !data) return null;
  return toCategory(data as Parameters<typeof toCategory>[0]);
}

function toBanner(b: {
  src: string;
  fallback: string;
  alt: string;
  eyebrow: string | null;
  eyebrow_ar: string | null;
  title: string | null;
  title_ar: string | null;
  desc: string | null;
  desc_ar: string | null;
  cta: string | null;
  cta_ar: string | null;
  href: string | null;
  fit: "cover" | "contain" | null;
  focal: string | null;
}): Banner {
  return {
    src: b.src,
    fallback: b.fallback || b.src,
    alt: b.alt,
    ...(b.eyebrow ? { eyebrow: b.eyebrow } : {}),
    ...(b.eyebrow_ar ? { eyebrowAr: b.eyebrow_ar } : {}),
    ...(b.title ? { title: b.title } : {}),
    ...(b.title_ar ? { titleAr: b.title_ar } : {}),
    ...(b.desc ? { desc: b.desc } : {}),
    ...(b.desc_ar ? { descAr: b.desc_ar } : {}),
    ...(b.cta ? { cta: b.cta } : {}),
    ...(b.cta_ar ? { ctaAr: b.cta_ar } : {}),
    ...(b.href ? { href: b.href } : {}),
    ...(b.fit ? { fit: b.fit } : {}),
    ...(b.focal ? { focal: b.focal } : {}),
  };
}

async function getBannersBySlot(slot: "hero" | "brand"): Promise<Banner[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("slot", slot)
    .is("deleted_at", null)
    .order("sort");
  if (error || !data) throw error ?? new Error("banners failed");
  return (data as Parameters<typeof toBanner>[0][]).map(toBanner);
}

export async function getHeroSlides(): Promise<Banner[]> {
  return getBannersBySlot("hero");
}

export async function getBrandBanners(): Promise<Banner[]> {
  return getBannersBySlot("brand");
}

function toArticle(a: {
  slug: string;
  title: string;
  title_ar: string | null;
  excerpt: string;
  excerpt_ar: string | null;
  image: string;
  date: string;
  author: string | null;
  content_html: string;
  content_ar: string | null;
}): Article {
  return {
    slug: a.slug,
    title: a.title,
    ...(a.title_ar ? { titleAr: a.title_ar } : {}),
    excerpt: a.excerpt,
    ...(a.excerpt_ar ? { excerptAr: a.excerpt_ar } : {}),
    image: a.image,
    date: a.date,
    ...(a.author ? { author: a.author } : {}),
    contentHtml: a.content_html,
    ...(a.content_ar ? { contentAr: a.content_ar } : {}),
  };
}

export async function getArticles(): Promise<Article[]> {
  requireConfigured();
  const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false });
  if (error || !data) throw error ?? new Error("articles failed");
  return (data as Parameters<typeof toArticle>[0][]).map(toArticle);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  requireConfigured();
  const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();
  if (error || !data) return null;
  return toArticle(data as Parameters<typeof toArticle>[0]);
}

export async function searchCatalog(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .ilike("title", `%${query.trim()}%`)
    .limit(20);
  if (error || !data) throw error ?? new Error("search failed");
  const ids = (data as DbProduct[]).map((p) => p.id);
  const { data: vars } = ids.length
    ? await supabase.from("variants").select("*").in("product_id", ids)
    : { data: [] };
  const vmap = new Map<string, DbVariant[]>();
  for (const v of ((vars as DbVariant[]) ?? [])) {
    const arr = vmap.get(v.product_id) ?? [];
    arr.push(v);
    vmap.set(v.product_id, arr);
  }
  return (data as DbProduct[]).map((p) => toProduct(p, vmap.get(p.id) ?? [], []));
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<Product[]> {
  const current = await getProductBySlug(slug);
  if (!current) return [];
  const pool = await getProductsByCollection(current.categorySlugs[0] ?? "best-sellers");
  return pool.filter((p) => p.slug !== slug).slice(0, limit);
}
