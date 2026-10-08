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
  Category,
  Coupon,
  Lineup,
  Note,
  Product,
  ProductNote,
  Review,
  Ritual,
  Variant,
} from "./types";
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
  ritual_id: string | null;
  notes_image_desktop: string | null;
  notes_image_mobile: string | null;
}

interface DbVariant {
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
    ...(r.notes.description ? { description: r.notes.description } : {}),
    ...(r.notes.description_ar ? { descriptionAr: r.notes.description_ar } : {}),
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
    ...(p.notes_image_desktop ? { notesImageDesktop: p.notes_image_desktop } : {}),
    ...(p.notes_image_mobile ? { notesImageMobile: p.notes_image_mobile } : {}),
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

  const noteMap = new Map<string, ProductNote[]>();
  if (ids.length) {
    const { data: noteRows } = await supabase
      .from("product_notes")
      .select("product_id, kind, position, notes(id, slug, name, name_ar, color, description, description_ar)")
      .in("product_id", ids)
      .order("position");
    for (const r of ((noteRows as unknown as DbProductNote[]) ?? [])) {
      const n = toProductNote(r);
      if (!n) continue;
      const arr = noteMap.get(r.product_id) ?? [];
      arr.push(n);
      noteMap.set(r.product_id, arr);
    }
  }

  const lineupMap = new Map<string, { id: string; slug: string; title: string; title_ar: string | null }>();
  const lineupIds = [...new Set((prods as DbProduct[]).map((p) => p.lineup_id).filter(Boolean))] as string[];
  if (lineupIds.length) {
    const { data: lineups } = await supabase.from("lineups").select("id, slug, title, title_ar").in("id", lineupIds);
    for (const l of (lineups ?? []) as { id: string; slug: string; title: string; title_ar: string | null }[]) {
      lineupMap.set(l.id, l);
    }
  }

  let list = (prods as DbProduct[]).map((p) =>
    toProduct(
      p,
      variantMap.get(p.id) ?? [],
      slugMap.get(p.id) ?? [],
      noteMap.get(p.id) ?? [],
      p.lineup_id ? lineupMap.get(p.lineup_id) : undefined,
    ),
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
  return (data as DbProduct[]).map((p) => toProduct(p, vmap.get(p.id) ?? [], [], []));
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<Product[]> {
  const current = await getProductBySlug(slug);
  if (!current) return [];
  const pool = await getProductsByCollection(current.categorySlugs[0] ?? "best-sellers");
  return pool.filter((p) => p.slug !== slug).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Lineups / notes / rituals / coupons / reviews
// ---------------------------------------------------------------------------

function toLineup(l: { id: string; slug: string; title: string; title_ar: string | null; description: string | null }): Lineup {
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
  const { data, error } = await supabase.from("lineups").select("*").order("sort");
  if (error || !data) throw error ?? new Error("lineups failed");
  return (data as Parameters<typeof toLineup>[0][]).map(toLineup);
}

/** Siblings in the same lineup (PDP "More from the lineup"). */
export async function getLineupSiblings(product: Product, limit = 4): Promise<Product[]> {
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
  return fetchProductsWithRelations({ slugs });
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
  const { data, error } = await supabase.from("rituals").select("*").order("title");
  if (error || !data) throw error ?? new Error("rituals failed");
  return (data as Parameters<typeof toRitual>[0][]).map(toRitual);
}

export async function getRitualById(id: string): Promise<Ritual | null> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase.from("rituals").select("*").eq("id", id).single();
  if (error || !data) return null;
  return toRitual(data as Parameters<typeof toRitual>[0]);
}

export async function getNotes(): Promise<Note[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase.from("notes").select("*").order("name");
  if (error || !data) throw error ?? new Error("notes failed");
  return (data ?? []).map((n: { id: string; slug: string; name: string; name_ar: string | null; color: string; description: string | null; description_ar: string | null }) => ({
    id: n.id,
    slug: n.slug,
    name: n.name,
    ...(n.name_ar ? { nameAr: n.name_ar } : {}),
    color: n.color ?? "#8a6d2f",
    ...(n.description ? { description: n.description } : {}),
    ...(n.description_ar ? { descriptionAr: n.description_ar } : {}),
  }));
}

function maskEmail(email: string): string {
  const [local] = email.split("@");
  if (!local) return "Guest";
  return local.length <= 2 ? `${local}···` : `${local.slice(0, 2)}···`;
}

export async function getApprovedReviews(productId: string, limit = 20): Promise<Review[]> {
  requireConfigured();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, product_id, user_id, rating, title, body, approved, created_at, profiles!inner(email)")
    .eq("product_id", productId)
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    title: string | null;
    body: string | null;
    approved: boolean;
    created_at: string;
    profiles: { email: string } | { email: string }[];
  }[]).map((r) => ({
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    rating: r.rating,
    ...(r.title ? { title: r.title } : {}),
    ...(r.body ? { body: r.body } : {}),
    approved: r.approved,
    createdAt: r.created_at,
    authorName: maskEmail(Array.isArray(r.profiles) ? r.profiles[0]?.email ?? "" : r.profiles?.email ?? ""),
  }));
}

/** Active public promo coupons for the storefront coupon strip. */
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
    firstOrderOnly: c.first_order_only,
    active: c.active,
    icon: c.icon ?? "tag",
    ...(c.gift_title ? { giftTitle: c.gift_title } : {}),
    ...(c.gift_title_ar ? { giftTitleAr: c.gift_title_ar } : {}),
    isPublic: c.is_public,
    ...(c.owner_id ? { ownerId: c.owner_id } : {}),
    ...(c.starts_at ? { startsAt: c.starts_at } : {}),
    ...(c.ends_at ? { endsAt: c.ends_at } : {}),
    ...(c.usage_limit != null ? { usageLimit: c.usage_limit } : {}),
    usedCount: c.used_count ?? 0,
  };
}
