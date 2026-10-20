import type { Metadata } from "next";
import { createPublicClient } from "./supabase/public";
import { isSupabaseConfigured } from "./supabase/keys";
import type { Locale } from "@/i18n/routing";
import { tx } from "./i18n";
import type { Product } from "./types";

function requireConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
}

// ---------------------------------------------------------------------------
// Page SEO: one optional row per storefront surface (page_type + slug).
// Everything renders invisibly — <head> tags, JSON-LD scripts, the single
// H1 — for crawlers and SEO tools, never as page content.
// ---------------------------------------------------------------------------

export type SeoPageType =
  | "product" | "collection" | "collections" | "home" | "info"
  | "find-your-scent" | "gifts" | "blog" | "article" | "search" | "private-label" | "locate-us";

export interface PageSeo {
  h1?: string;
  h1Ar?: string;
  metaTitle?: string;
  metaTitleAr?: string;
  metaDescription?: string;
  metaDescriptionAr?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  schemaJson?: unknown;
}

interface SeoRow {
  h1: string | null; h1_ar: string | null;
  meta_title: string | null; meta_title_ar: string | null;
  meta_description: string | null; meta_description_ar: string | null;
  canonical: string | null; robots: string | null;
  og_title: string | null; og_description: string | null; og_image: string | null;
  schema_json: unknown;
}

function toPageSeo(r: SeoRow): PageSeo {
  const s: PageSeo = {};
  if (r.h1) s.h1 = r.h1;
  if (r.h1_ar) s.h1Ar = r.h1_ar;
  if (r.meta_title) s.metaTitle = r.meta_title;
  if (r.meta_title_ar) s.metaTitleAr = r.meta_title_ar;
  if (r.meta_description) s.metaDescription = r.meta_description;
  if (r.meta_description_ar) s.metaDescriptionAr = r.meta_description_ar;
  if (r.canonical) s.canonical = r.canonical;
  if (r.robots) s.robots = r.robots;
  if (r.og_title) s.ogTitle = r.og_title;
  if (r.og_description) s.ogDescription = r.og_description;
  if (r.og_image) s.ogImage = r.og_image;
  if (r.schema_json && typeof r.schema_json === "object" && Object.keys(r.schema_json as object).length) {
    s.schemaJson = r.schema_json;
  }
  return s;
}

/** Live SEO row, or null when unset (or when the migration hasn't run —
    storefront pages must never break on a pending migration). */
export async function getPageSeo(type: SeoPageType, slug = ""): Promise<PageSeo | null> {
  try {
    requireConfigured();
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("page_seo")
      .select("*")
      .eq("page_type", type)
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return toPageSeo(data as SeoRow);
  } catch {
    return null;
  }
}

/** Validate the free-form schema textarea (admin save actions). */
export function parseSchemaJson(raw: string): unknown {
  const clean = raw.trim();
  if (!clean) return {};
  const parsed: unknown = JSON.parse(clean);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Schema must be a JSON object (keys like @context, @type).");
  }
  return parsed;
}

/** Storefront path for a SEO row (unprefixed; locale router prefixes /ar). */
export function seoPathFor(type: SeoPageType, slug = ""): string {
  switch (type) {
    case "product": return `/product/${slug}`;
    case "collection": return `/collection/${slug}`;
    case "collections": return "/collections";
    case "home": return "/";
    case "info": return `/pages/${slug}`;
    case "find-your-scent": return "/find-your-scent";
    case "gifts": return "/gifts";
    case "blog": return "/posts";
    case "article": return `/blog/${slug}`;
    case "search": return "/search";
    case "private-label": return "/private-label";
    case "locate-us": return "/locate-us";
  }
}

export const SEO_TYPE_LABELS: Record<SeoPageType, string> = {
  product: "Product",
  collection: "Collection",
  collections: "Collections index",
  home: "Homepage",
  info: "Info page",
  "find-your-scent": "Find your scent",
  gifts: "Gifts",
  blog: "Blogs index",
  article: "Journal article",
  search: "Search",
  "private-label": "Private label",
  "locate-us": "Locate us",
};

/** Next Metadata from an SEO row over page fallbacks (locale-aware). */
export function seoMetadata(
  seo: PageSeo | null,
  fallback: { title: string; description: string },
  locale: Locale,
): Metadata {
  const title = tx(seo?.metaTitle ?? "", seo?.metaTitleAr, locale) || fallback.title;
  const description = tx(seo?.metaDescription ?? "", seo?.metaDescriptionAr, locale) || fallback.description;
  const meta: Metadata = { title, description };
  if (seo?.canonical) meta.alternates = { canonical: seo.canonical };
  if (seo?.robots) {
    const v = seo.robots.toLowerCase();
    meta.robots = {
      index: !v.includes("noindex"),
      follow: !v.includes("nofollow"),
    };
  }
  if (seo?.ogTitle || seo?.ogDescription || seo?.ogImage) {
    meta.openGraph = {
      title: tx(seo.ogTitle ?? "", undefined, locale) || title,
      description: tx(seo.ogDescription ?? "", undefined, locale) || description,
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    };
  }
  return meta;
}

/** Strip tags for schema text fields. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

/** Auto Product JSON-LD merged with the row's custom schema (custom wins
    on key conflicts, arrays concatenate). */
export function productJsonLd(
  product: {
    slug: string;
    title: string; titleAr?: string;
    descriptionHtml: string;
    images: string[];
    price: number;
    compareAtPrice?: number;
    rating: number; reviewCount: number;
  },
  seo: PageSeo | null,
  locale: Locale,
  origin: string,
): Record<string, unknown>[] {
  const auto: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tx(product.title, product.titleAr, locale),
    description: stripHtml(product.descriptionHtml).slice(0, 500),
    ...(product.images.length ? { image: product.images.slice(0, 8) } : {}),
    brand: { "@type": "Brand", name: "Misk Al Ghazaal" },
    offers: {
      "@type": "Offer",
      url: `${origin}${seoPathFor("product", product.slug)}`,
      priceCurrency: "AED",
      price: product.price.toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };
  if (product.reviewCount > 0) {
    auto.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviewCount,
    };
  }
  return mergeSchemas([auto], seo?.schemaJson);
}

/** Auto Article JSON-LD merged with custom schema. */
export function articleJsonLd(
  article: { title: string; titleAr?: string; excerpt: string; image: string; date: string; author?: string },
  seo: PageSeo | null,
  locale: Locale,
): Record<string, unknown>[] {
  const auto: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: tx(article.title, article.titleAr, locale),
    description: article.excerpt,
    ...(article.image ? { image: [article.image] } : {}),
    datePublished: article.date,
    author: { "@type": "Organization", name: article.author || "Misk Al Ghazaal" },
  };
  return mergeSchemas([auto], seo?.schemaJson);
}

/** Custom schema alone (collections, home, info…), as a block list. */
export function customJsonLd(seo: PageSeo | null): Record<string, unknown>[] {
  return mergeSchemas([], seo?.schemaJson);
}

function mergeSchemas(
  base: Record<string, unknown>[],
  custom: unknown,
): Record<string, unknown>[] {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return base;
  const extra = custom as Record<string, unknown>;
  if (!Object.keys(extra).length) return base;
  if (!base.length) return [withContext(extra)];
  const merged = { ...base[0] };
  for (const [k, v] of Object.entries(extra)) {
    if (k === "@context" || k === "@type") continue;
    const cur = merged[k];
    if (Array.isArray(cur) && Array.isArray(v)) merged[k] = [...cur, ...v];
    else merged[k] = v;
  }
  return [merged];
}

function withContext(o: Record<string, unknown>): Record<string, unknown> {
  return { "@context": "https://schema.org", ...o };
}
