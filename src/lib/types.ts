// Supabase-backed e-commerce domain model.
// Mirrors the Supabase tables 1:1 (see supabase/schema.sql); no Shopify
// concepts (no Liquid, no handles-as-ids). Seeded from supabase/seed.sql.

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
  /** Short "about this perfume" blurb for the PDP About block. */
  shortDesc?: string;
  shortDescAr?: string;
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
  /** Lineup classification (PDP "More from the lineup"). */
  lineupId?: string;
  lineupSlug?: string;
  lineupTitle?: string;
  lineupTitleAr?: string;
  /** Reusable how-to-use guide. */
  ritualId?: string;
  /** Full artwork for the detailed notes section (responsive pair). */
  notesImageDesktop?: string;
  notesImageMobile?: string;
  /** Fragrance notes brief (color dots + names). */
  notes: ProductNote[];
}

export interface Note {
  id: string;
  slug: string;
  name: string;
  nameAr?: string;
  color: string;
  description?: string;
  descriptionAr?: string;
}

export interface ProductNote extends Note {
  kind: "top" | "heart" | "base";
}

export interface Lineup {
  id: string;
  slug: string;
  title: string;
  titleAr?: string;
  description?: string;
}

export interface Ritual {
  id: string;
  slug: string;
  title: string;
  titleAr?: string;
  bodyHtml: string;
  bodyAr?: string;
  image?: string;
  videoUrl?: string;
}

export type CouponKind = "percent" | "fixed" | "free_shipping" | "gift";

export interface Coupon {
  id: string;
  code: string;
  kind: CouponKind;
  amount: number;
  minSubtotal: number;
  firstOrderOnly: boolean;
  active: boolean;
  icon: string;
  giftTitle?: string;
  giftTitleAr?: string;
  isPublic: boolean;
  ownerId?: string;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  usedCount: number;
}

/** Server-computed price breakdown for a bag + code + referral. */
export interface Quote {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string;
  couponKind?: CouponKind;
  giftTitle?: string;
  referralCode: string;
  referralDiscount: number;
  freeShipping: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
  approved: boolean;
  createdAt: string;
  authorName?: string;
}

export interface CountryState {
  en: string;
  ar?: string;
}

export interface DeliveryCountry {
  code: string;
  name: string;
  nameAr?: string;
  states: CountryState[];
}

/** Structured delivery answer from the address picker. */
export interface DeliveryAnswer {
  label: "home" | "work";
  line: string;
  building: string;
  countryCode: string;
  state: string;
  city: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
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
