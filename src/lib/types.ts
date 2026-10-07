// Supabase-ready e-commerce domain model.
// Mirrors future Supabase tables; no Shopify concepts (no Liquid, no handles-as-ids).
// Phase 1: fed by lib/mock-data.ts. Phase 2: replace mock imports with Supabase queries.

export interface Variant {
  id: string;
  title: string; // e.g. "12ml", "50ml", "100g"
  price: number; // AED
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  /** Arabic display name — transliteration of the same name, never a
   *  meaning-translation (admin panel writes this; falls back to title). */
  titleAr?: string;
  descriptionHtml: string;
  /** Short Arabic description (admin panel writes; falls back to English). */
  descriptionAr?: string;
  price: number; // base AED price (first variant price)
  compareAtPrice?: number;
  images: string[];
  categorySlugs: string[];
  tags: string[];
  rating: number; // 0-5
  reviewCount: number;
  variants: Variant[];
  featured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  /** Shopify template variant: standard (product.json) vs miskalgazaal (product.miskalgazaal.json single-product layout). */
  template?: "standard" | "miskalgazaal";
}

/** Homepage / collection hero banner.
 *  `src` is the EXACT original Shopify file expected in `public/banners/`;
 *  `fallback` is a guaranteed-local image shown until you drop the file in.
 *  `fit`/`focal` are per-banner art direction (a future admin panel will
 *  edit these per slide — never hardcode presentation in components). */
export interface Banner {
  src: string;
  fallback: string;
  alt: string;
  eyebrow?: string;
  title?: string;
  desc?: string;
  cta?: string;
  href?: string;
  fit?: "cover" | "contain";
  focal?: string;
  eyebrowAr?: string;
  titleAr?: string;
  descAr?: string;
  ctaAr?: string;
}

export interface Category {
  id: string;
  slug: string;
  title: string;
  titleAr?: string;
  image: string;
  description?: string;
  descriptionAr?: string;
  productCount?: number;
}

export interface Article {
  slug: string;
  title: string;
  titleAr?: string;
  excerpt: string;
  excerptAr?: string;
  image: string;
  date: string;
  author?: string;
  contentHtml: string;
  contentAr?: string;
}

export interface CartItem {
  productSlug: string;
  variantId?: string;
  qty: number;
}

export interface OrderStub {
  id: string;
  date: string;
  total: number;
  status: "pending" | "fulfilled" | "cancelled";
}
