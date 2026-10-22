import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSearchIndex, searchDocument } from "./search-index";
import { productAvailable } from "./product-options";
// ---------------------------------------------------------------------------
// Database-backed data-access layer (Supabase is the ONLY source of truth).
//
// Pages and blocks must import from here — never query Supabase directly.
// Every getter throws when Supabase env is missing or a query fails, so a
// misconfigured deploy fails loudly instead of serving stale mock data.
// ---------------------------------------------------------------------------

import type {
  Article,
  Banner,
  BannerTextAlign,
  Category,
  Coupon,
  CountryState,
  DeliveryCountry,
  Lineup,
  Note,
  Product,
  ProductNote,
  Review,
  Ritual,
  Variant,
} from "./types";
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
  out_of_stock?: boolean;
  demand_score?: number;
  auto_best_seller?: boolean;
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description_html: string;
  description_ar: string | null;
  pdp_content?: Record<string, string> | null;
  short_desc: string | null;
  short_desc_ar: string | null;
  price: number;
  compare_at: number | null;
  images: string[];
  rating: number;
  review_count: number;
  featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  template: "standard" | "miskalgazaal";
  lineup_id: string | null;
  is_active: boolean | null;
  ritual_id: string | null;
  sort: number | null;
  sales_count: number | null;
  created_at: string | null;
  notes_image_desktop: string | null;
  notes_image_mobile: string | null;
}

interface DbVariant {
  concentration?: string | null;
  capacity_ml?: number | null;
  name_override?: string | null;
  images?: string[];
  use_product_images?: boolean;
  is_active?: boolean;
  id: string;
  product_id: string;
  title: string;
  price: number;
  stock: number;
  sku: string | null;
}

interface DbProductNote {
  product_id: string;
  kind: "top" | "heart" | "base";
  position: number;
  notes: {
    id: string;
    slug: string;
    name: string;
    name_ar: string | null;
    color: string;
    glyph?: string | null;
    description: string | null;
    description_ar: string | null;
  } | null;
}

function toProductNote(r: DbProductNote): ProductNote | null {
  if (!r.notes) return null;
  return {
    id: r.notes.id,
    slug: r.notes.slug,
    name: r.notes.name,
    ...(r.notes.name_ar ? { nameAr: r.notes.name_ar } : {}),
    color: r.notes.color ?? "#8a6d2f",
    glyph: r.notes.glyph ?? "droplet",
    ...(r.notes.description ? { description: r.notes.description } : {}),
    ...(r.notes.description_ar
      ? { descriptionAr: r.notes.description_ar }
      : {}),
    kind: r.kind,
  };
}

function toProduct(
  p: DbProduct,
  variants: DbVariant[],
  slugs: string[],
  notes: ProductNote[],
  lineup?: { id: string; slug: string; title: string; title_ar: string | null },
): Product {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    ...(p.title_ar ? { titleAr: p.title_ar } : {}),
    descriptionHtml: p.description_html,
    pdpContent: p.pdp_content ?? {},
    ...(p.description_ar ? { descriptionAr: p.description_ar } : {}),
    ...(p.short_desc ? { shortDesc: p.short_desc } : {}),
    ...(p.short_desc_ar ? { shortDescAr: p.short_desc_ar } : {}),
    price: Number(p.price),
    ...(p.compare_at != null ? { compareAtPrice: Number(p.compare_at) } : {}),
    images: p.images ?? [],
    categorySlugs: slugs,
    tags: slugs,
    rating: Number(p.rating ?? 0),
    reviewCount: p.review_count ?? 0,
    notes,
    ...(p.lineup_id
      ? {
          lineupId: p.lineup_id,
          ...(lineup
            ? {
                lineupSlug: lineup.slug,
                lineupTitle: lineup.title,
                ...(lineup.title_ar ? { lineupTitleAr: lineup.title_ar } : {}),
              }
            : {}),
        }
      : {}),
    ...(p.ritual_id ? { ritualId: p.ritual_id } : {}),
    ...(p.notes_image_desktop
      ? { notesImageDesktop: p.notes_image_desktop }
      : {}),
    ...(p.notes_image_mobile ? { notesImageMobile: p.notes_image_mobile } : {}),
    variants: variants.filter(v => v.is_active !== false).sort((a,b)=>(a.concentration ?? "").localeCompare(b.concentration ?? "") || Number(a.capacity_ml ?? 0)-Number(b.capacity_ml ?? 0) || a.id.localeCompare(b.id)).map(
      (v): Variant => ({
        id: v.id,
        title: v.title,
        price: Number(v.price),
        stock: v.stock,
        concentration: v.concentration ?? undefined, capacityMl: v.capacity_ml == null ? undefined : Number(v.capacity_ml),
        nameOverride: v.name_override ?? undefined, images: v.images ?? [], useProductImages: v.use_product_images ?? true,
        ...(v.sku ? { sku: v.sku } : {}),
      }),
    ),
    ...(p.featured ? { featured: true } : {}),
    ...(p.is_new ? { isNew: true } : {}),
    ...(p.is_best_seller ? { isBestSeller: true } : {}),
    template: p.template ?? "standard",
    isActive: p.is_active ?? true,
    outOfStock: p.out_of_stock ?? false, demandScore: Number(p.demand_score ?? 0), autoBestSeller: p.auto_best_seller ?? false,
    sortRank: p.sort ?? 0,
    salesCount: p.sales_count ?? 0,
    ...(p.created_at ? { createdAt: p.created_at } : {}),
  };
}

const fetchProductsWithRelations = cache(fetchProductsWithRelationsUncached);

async function fetchProductsWithRelationsUncached(filter?: {
  slugs?: string[];
  collectionId?: string;
  includeInactive?: boolean;
}): Promise<Product[]> {
  requireConfigured();
  const supabase = await createClient();
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

  const noteMap = new Map<string, ProductNote[]>();
  if (ids.length) {
    const { data: noteRows } = await supabase
      .from("product_notes")
      .select("product_id, kind, position, notes(*)")
      .in("product_id", ids)
      .order("position");
    for (const r of (noteRows as unknown as DbProductNote[]) ?? []) {
      const n = toProductNote(r);
      if (!n) continue;
      const arr = noteMap.get(r.product_id) ?? [];
      arr.push(n);
      noteMap.set(r.product_id, arr);
    }
  }

  const lineupMap = new Map<
    string,
    { id: string; slug: string; title: string; title_ar: string | null }
  >();
  const lineupIds = [
    ...new Set((prods as DbProduct[]).map((p) => p.lineup_id).filter(Boolean)),
  ] as string[];
  if (lineupIds.length) {
    const { data: lineups } = await supabase
      .from("lineups")
      .select("id, slug, title, title_ar")
      .in("id", lineupIds);
    for (const l of (lineups ?? []) as {
      id: string;
      slug: string;
      title: string;
      title_ar: string | null;
    }[]) {
      lineupMap.set(l.id, l);
    }
  }

  let list = (prods as (DbProduct & { is_active?: boolean | null })[]).map(
    (p) =>
      toProduct(
        p,
        variantMap.get(p.id) ?? [],
        slugMap.get(p.id) ?? [],
        noteMap.get(p.id) ?? [],
        p.lineup_id ? lineupMap.get(p.lineup_id) : undefined,
      ),
  );
  list = filter?.includeInactive
    ? list
    : list.filter((p) => p.isActive !== false);
  if (filter?.collectionId) {
    const { data: scoped } = await supabase
      .from("product_collections")
      .select("product_id")
      .eq("collection_id", filter.collectionId);
    const keep = new Set(
      (scoped ?? []).map((s: { product_id: string }) => s.product_id),
    );
    list = list.filter((p) => keep.has(p.id));
  }
  return list;
}

export function rankScore(p: Product): number {
  return (p.sortRank ?? 0) - (p.isBestSeller ? 5000 : 0) - (p.demandScore ?? 0) * 10 - (p.salesCount ?? 0);
}

export function rankProducts<T extends Product>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const d = rankScore(a) - rankScore(b);
    if (d !== 0) return d;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

export async function getProducts(): Promise<Product[]> {
  return rankProducts(await fetchProductsWithRelations());
}

export const getProductBySlug = cache(async function getProductBySlug(slug: string): Promise<Product | null> {
  const list = await fetchProductsWithRelations({ slugs: [slug] });
  return list[0] ?? null;
});

const FLAG_COLLECTIONS = new Set(["best-sellers", "new-arrivals"]);

export const getProductsByCollection = cache(async function getProductsByCollection(
  slug: string,
  opts?: {
    sort?: string | null;
    maxPrice?: number | null;
    minPrice?: number | null;
    inStockOnly?: boolean;
    onSaleOnly?: boolean;
    minRating?: number | null;
    lineup?: string | null;
  ritual?: string | null;
  note?: string | null;
  },
): Promise<Product[]> {
  requireConfigured();
  let items: Product[];
  if (slug === "all") {
    items = await fetchProductsWithRelations();
  } else if (FLAG_COLLECTIONS.has(slug)) {
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
  items = applyCatalogFacets(items, opts);
  return applyCatalogSort(items, opts?.sort);
});

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

export const getCollections = cache(async function getCollections(): Promise<Category[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .is("deleted_at", null)
    .order("sort");
  if (error || !data) throw error ?? new Error("collections failed");
  return data.map(toCategory);
});

export async function getCollectionBySlug(
  slug: string,
): Promise<Category | null> {
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
  mobile_src?: string; mobile_fallback?: string;
  id?: string;
  slot?: string;
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
  // For hero banners, `eyebrow` can store text alignment ("center" | "bottom-left")
  // so no SQL schema migration is required on existing `banners` tables.
  const rawAlign = (b.eyebrow ?? "").trim().toLowerCase();
  const align: BannerTextAlign =
    rawAlign === "center" || rawAlign === "bottom-center" ? rawAlign : "bottom-left";

  return {
    ...(b.id ? { id: b.id } : {}),
    src: b.src,
    mobileSrc: b.mobile_src || undefined, mobileFallback: b.mobile_fallback || undefined,
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
    align,
  };
}

async function getBannersBySlot(slot: "hero" | "brand" | "navigation"): Promise<Banner[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("slot", slot)
    .is("deleted_at", null)
    .order("sort").order("id");
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

export interface CatalogQuery {
  sort?: string | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  minRating?: number | null;
  lineup?: string | null;
  ritual?: string | null;
  note?: string | null;
}

function applyCatalogFacets<T extends Product>(
  items: T[],
  opts?: CatalogQuery,
): T[] {
  let out = items;
  if (opts?.inStockOnly)
    out = out.filter((p) => productAvailable(p));
  if (opts?.onSaleOnly)
    out = out.filter(
      (p) => p.compareAtPrice != null && p.compareAtPrice > p.price,
    );
  if (opts?.minRating != null)
    out = out.filter((p) => p.rating >= (opts.minRating as number));
  if (opts?.maxPrice != null)
    out = out.filter((p) => p.price <= (opts.maxPrice as number));
  if (opts?.minPrice != null)
    out = out.filter((p) => p.price >= (opts.minPrice as number));
  if (opts?.lineup) out = out.filter((p) => p.lineupSlug === opts.lineup);
  if (opts?.ritual) out = out.filter((p) => p.ritualId === opts.ritual);
  if (opts?.note) out = out.filter((p) => p.notes.some((n) => n.slug === opts.note));
  return out;
}

function applyCatalogSort<T extends Product>(
  items: T[],
  sort?: string | null,
): T[] {
  if (sort === "price-asc") return [...items].sort((a, b) => a.price - b.price);
  if (sort === "price-desc")
    return [...items].sort((a, b) => b.price - a.price);
  if (sort === "rating") return [...items].sort((a, b) => b.rating - a.rating);
  if (sort === "discount")
    return [...items].sort(
      (a, b) => discountPct(b) - discountPct(a) || rankScore(a) - rankScore(b),
    );
  if (sort === "newest")
    return [...items].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  if (sort === "popular")
    return [...items].sort(
      (a, b) =>
        (b.demandScore ?? 0) - (a.demandScore ?? 0) ||
        (b.salesCount ?? 0) - (a.salesCount ?? 0) ||
        rankScore(a) - rankScore(b),
    );
  return rankProducts(items);
}

function discountPct(p: Product): number {
  if (p.compareAtPrice == null || p.compareAtPrice <= p.price) return 0;
  return (p.compareAtPrice - p.price) / p.compareAtPrice;
}

// Cookie-free catalog snapshot shared across requests; mutations expire this tag.
export const getSearchProducts = unstable_cache(
  async (includeInactive = false) => fetchProductsWithRelationsUncached({includeInactive}),
  ["catalog-search-v2"], {tags:["catalog-search"], revalidate:60},
);
const searchIndexes=new Map<boolean,{version:string;engine:ReturnType<typeof createSearchIndex>}>();
async function indexedMatches(query:string, includeInactive=false) {
  const products = await getSearchProducts(includeInactive);
  const documents=products.map(searchDocument);
  const version=JSON.stringify(documents);
  let indexed=searchIndexes.get(includeInactive);
  if(!indexed || indexed.version!==version){indexed={version,engine:createSearchIndex(documents)};searchIndexes.set(includeInactive,indexed);}
  const byId = new Map(products.map(p=>[p.id,p]));
  return indexed.engine.search(query).map(d=>byId.get(d.id)!).filter(Boolean);
}
export async function searchCatalog(query:string, opts?:CatalogQuery):Promise<Product[]> {
  if (!query.trim()) return [];
  const matches=applyCatalogFacets(await indexedMatches(query),opts);
  return opts?.sort && opts.sort !== "featured" ? applyCatalogSort(matches,opts.sort) : matches;
}
export async function suggestProducts(query:string,limit=8,opts?:{includeInactive?:boolean}):Promise<Product[]> {
  if(query.trim().length<2)return [];
  return (await indexedMatches(query,opts?.includeInactive)).slice(0,Math.min(12,Math.max(1,limit)));
}

export async function getRelatedProducts(
  slug: string,
  limit = 4,
): Promise<Product[]> {
  const current = await getProductBySlug(slug);
  if (!current) return [];
  const pool = await getProductsByCollection(
    current.categorySlugs[0] ?? "best-sellers",
  );
  return pool.filter((p) => p.slug !== slug).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Lineups / notes / rituals / coupons / reviews
// ---------------------------------------------------------------------------

function toLineup(l: {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  description: string | null;
}): Lineup {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    ...(l.title_ar ? { titleAr: l.title_ar } : {}),
    ...(l.description ? { description: l.description } : {}),
  };
}

export async function getLineups(): Promise<Lineup[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lineups")
    .select("*")
    .order("sort");
  if (error || !data) throw error ?? new Error("lineups failed");
  return (data as Parameters<typeof toLineup>[0][]).map(toLineup);
}

/** Active homepage sections in admin order (drives the home screen). */
export interface HomepageSectionConfig {
  mode?: "collection" | "manual";
  collection?: string;
  slugs?: string[];
  limit?: number;
  src?: string;
  secondarySrc?: string;
  href?: string;
  secondaryHref?: string;
  title?: string;
  desc?: string;
  descAr?: string;
  cta?: string;
  ctaAr?: string;
  secondaryCta?: string;
  secondaryCtaAr?: string;
  badge?: string;
  badgeAr?: string;
  /** Scent Alchemist overrides (stored inside JSONB config) */
  prompt?: string;
  promptAr?: string;
  noteSlugs?: string[];
  /** Dual Feature overrides */
  leftEyebrow?: string;
  leftEyebrowAr?: string;
  leftTitle?: string;
  leftTitleAr?: string;
  leftCta?: string;
  leftCtaAr?: string;
  leftHref?: string;
  leftSrc?: string;
  rightEyebrow?: string;
  rightEyebrowAr?: string;
  rightTitle?: string;
  rightTitleAr?: string;
  rightCta?: string;
  rightCtaAr?: string;
  rightHref?: string;
  rightSrc?: string;
}

export interface HomepageSection {
  id: string;
  kind:
    | "products_carousel"
    | "product_tabs"
    | "collections_grid"
    | "brand_split"
    | "parallax_cta"
    | "story"
    | "dual_feature"
    | "testimonials"
    | "blog_grid"
    | "instagram"
    | "image_banner"
    | "scent_alchemist";
  title: string;
  titleAr?: string;
  eyebrow: string;
  eyebrowAr?: string;
  config: HomepageSectionConfig;
}

export async function getHomepageSections(): Promise<HomepageSection[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("*")
    .eq("active", true)
    .order("sort");
  if (error || !data) return [];
  return (
    data as {
      id: string;
      kind: HomepageSection["kind"];
      title: string;
      title_ar: string | null;
      eyebrow: string | null;
      eyebrow_ar: string | null;
      config: HomepageSectionConfig | null;
    }[]
  ).map((s) => ({
    id: s.id,
    kind: s.kind,
    title: s.title ?? "",
    ...(s.title_ar ? { titleAr: s.title_ar } : {}),
    eyebrow: s.eyebrow ?? "",
    ...(s.eyebrow_ar ? { eyebrowAr: s.eyebrow_ar } : {}),
    config: s.config ?? {},
  }));
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  const clean = [...new Set(slugs.filter(Boolean))];
  if (!clean.length) return [];
  const list = await fetchProductsWithRelations({ slugs: clean });
  const pos = new Map(clean.map((s, i) => [s, i]));
  return rankProducts(list).sort(
    (a, b) => (pos.get(a.slug) ?? 0) - (pos.get(b.slug) ?? 0),
  );
}

export async function getLineupSiblings(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  if (!product.lineupId) return [];
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("lineup_id", product.lineupId)
    .is("deleted_at", null)
    .neq("id", product.id)
    .limit(limit);
  if (error || !data) return [];
  const slugs = (data as { slug: string }[]).map((r) => r.slug);
  if (!slugs.length) return [];
  return rankProducts(await fetchProductsWithRelations({ slugs }));
}

function toRitual(r: {
  id: string;
  slug: string;
  title: string;
  title_ar: string | null;
  body_html: string;
  body_ar: string | null;
  image: string | null;
  video_url: string | null;
}): Ritual {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    ...(r.title_ar ? { titleAr: r.title_ar } : {}),
    bodyHtml: r.body_html ?? "",
    ...(r.body_ar ? { bodyAr: r.body_ar } : {}),
    ...(r.image ? { image: r.image } : {}),
    ...(r.video_url ? { videoUrl: r.video_url } : {}),
  };
}

export async function getRituals(): Promise<Ritual[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rituals")
    .select("*")
    .order("title");
  if (error || !data) throw error ?? new Error("rituals failed");
  return (data as Parameters<typeof toRitual>[0][]).map(toRitual);
}

export async function getRitualById(id: string): Promise<Ritual | null> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rituals")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return toRitual(data as Parameters<typeof toRitual>[0]);
}

export async function getNotes(): Promise<Note[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("name");
  if (error || !data) throw error ?? new Error("notes failed");
  return (data ?? []).map(
    (n: {
      id: string;
      slug: string;
      name: string;
      name_ar: string | null;
      color: string;
      glyph?: string | null;
      description: string | null;
      description_ar: string | null;
    }) => ({
      id: n.id,
      slug: n.slug,
      name: n.name,
      ...(n.name_ar ? { nameAr: n.name_ar } : {}),
      color: n.color ?? "#8a6d2f",
      glyph: n.glyph ?? "droplet",
      ...(n.description ? { description: n.description } : {}),
      ...(n.description_ar ? { descriptionAr: n.description_ar } : {}),
    }),
  );
}

export async function getDeliveryCountries(): Promise<DeliveryCountry[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_countries")
    .select("code, name_en, name_ar, states")
    .eq("active", true)
    .order("sort");
  if (error || !data) return [];
  return (
    data as {
      code: string;
      name_en: string;
      name_ar: string | null;
      states: CountryState[] | null;
    }[]
  ).map((c) => ({
    code: c.code,
    name: c.name_en,
    ...(c.name_ar ? { nameAr: c.name_ar } : {}),
    states: Array.isArray(c.states) ? c.states : [],
  }));
}

export async function getApprovedReviews(
  productId: string,
  limit = 20,
): Promise<Review[]> {
  requireConfigured();
  const { readApprovedReviews } = await import("./product-reviews");
  return readApprovedReviews(productId, limit);
}

export async function getPublicCoupons(): Promise<Coupon[]> {
  requireConfigured();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("is_public", true)
    .eq("active", true)
    .is("owner_id", null)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("created_at");
  if (error || !data) return [];
  return (data ?? []).map(toCouponRow);
}

export function toCouponRow(c: {
  id: string;
  code: string;
  kind: Coupon["kind"];
  amount: number;
  min_subtotal: number;
  max_discount: number | null;
  once_per_account: boolean;
  first_order_only: boolean;
  active: boolean;
  icon: string;
  gift_title: string | null;
  gift_title_ar: string | null;
  is_public: boolean;
  owner_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
}): Coupon {
  return {
    id: c.id,
    code: c.code,
    kind: c.kind,
    amount: Number(c.amount ?? 0),
    minSubtotal: Number(c.min_subtotal ?? 0),
    ...(c.max_discount != null ? { maxDiscount: Number(c.max_discount) } : {}),
    firstOrderOnly: c.first_order_only,
    active: c.active,
    icon: c.icon ?? "tag",
    ...(c.gift_title ? { giftTitle: c.gift_title } : {}),
    ...(c.gift_title_ar ? { giftTitleAr: c.gift_title_ar } : {}),
    isPublic: c.is_public,
    ...(c.owner_id ? { ownerId: c.owner_id } : {}),
    ...(c.starts_at ? { startsAt: c.starts_at } : {}),
    ...(c.ends_at ? { endsAt: c.ends_at } : {}),
    ...((c.once_per_account ? 1 : c.usage_limit) != null ? { usageLimit: c.once_per_account ? 1 : c.usage_limit! } : {}),
    usedCount: c.used_count ?? 0,
  };
}

/** Only the first two published navigation campaigns are displayed. */
export const getNavigationBanners = cache(async function getNavigationBanners(): Promise<Banner[]> {
  return (await getBannersBySlot("navigation")).filter((banner) => banner.src).slice(0, 2);
});

/** Lightweight popularity signal for navigation; never hydrate the whole catalog in chrome. */
export const getNoteUsage = cache(async (): Promise<Map<string, number>> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("product_notes").select("note_id, product_id, products!inner(id)").is("products.deleted_at", null).eq("products.is_active", true).limit(10000);
  const counts = new Map<string, number>();
  if (error) return counts; // Alphabetical note ordering remains usable before product-active migration.
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const key = `${row.product_id}:${row.note_id}`;
    if (seen.has(key)) continue;
    seen.add(key); counts.set(row.note_id, (counts.get(row.note_id) ?? 0) + 1);
  }
  return counts;
});
