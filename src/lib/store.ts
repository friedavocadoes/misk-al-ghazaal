// ---------------------------------------------------------------------------
// API-ready data-access layer.
//
// Pages and blocks must import from here — never from mock-data directly.
// Every function is async with a narrow, serializable return type, mirroring
// a future REST/Supabase backend. To go live, replace each body with a fetch
// (or Supabase query) and keep the signatures unchanged.
//
//   getProducts()            → GET /api/products
//   getProductBySlug(slug)   → GET /api/products/:slug
//   getCollections()         → GET /api/collections
//   getCollectionBySlug(slug)→ GET /api/collections/:slug
//   getBanners()             → GET /api/banners
//   getArticles()            → GET /api/articles
// ---------------------------------------------------------------------------

import {
  articles,
  brandBanners,
  collections,
  getCategory,
  getProduct,
  getProductsByCategory,
  heroSlides,
  products,
  searchProducts,
} from "./mock-data";
import type { Banner } from "./types";

export type ProductListItem = (typeof products)[number];
export type CollectionListItem = (typeof collections)[number];

async function ok<T>(value: T): Promise<T> {
  return value;
}

export async function getProducts() {
  return ok(products);
}

export async function getProductBySlug(slug: string) {
  return ok(getProduct(slug) ?? null);
}

export async function getProductsByCollection(
  slug: string,
  opts?: { sort?: string | null; maxPrice?: number | null; inStockOnly?: boolean }
) {
  let items = getProductsByCategory(slug);
  if (opts?.inStockOnly) {
    items = items.filter((p) => p.variants.some((v) => v.stock > 0));
  }
  if (opts?.maxPrice != null) {
    items = items.filter((p) => p.price <= (opts.maxPrice as number));
  }
  if (opts?.sort === "price-asc") items = [...items].sort((a, b) => a.price - b.price);
  if (opts?.sort === "price-desc") items = [...items].sort((a, b) => b.price - a.price);
  if (opts?.sort === "rating") items = [...items].sort((a, b) => b.rating - a.rating);
  return ok(items);
}

export async function getCollections() {
  return ok(collections);
}

export async function getCollectionBySlug(slug: string) {
  return ok(getCategory(slug) ?? null);
}

export async function getHeroSlides(): Promise<Banner[]> {
  return ok(heroSlides);
}

export async function getBrandBanners(): Promise<Banner[]> {
  return ok(brandBanners);
}

export async function getArticles() {
  return ok(articles);
}

export async function getArticleBySlug(slug: string) {
  return ok(articles.find((a) => a.slug === slug) ?? null);
}

export async function searchCatalog(query: string) {
  return ok(searchProducts(query));
}

export async function getRelatedProducts(slug: string, limit = 4) {
  const current = getProduct(slug);
  if (!current) return ok([]);
  const pool = getProductsByCategory(current.categorySlugs[0] ?? "best-sellers");
  return ok(pool.filter((p) => p.slug !== slug).slice(0, limit));
}
