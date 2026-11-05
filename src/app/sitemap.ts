import type { MetadataRoute } from "next";
import { getBlogs, blogUrl } from "@/lib/blogs";
import { getProducts, getCollections } from "@/lib/store";
import { getSitemapOrigin } from "@/lib/site-url";
import { createPublicClient } from "@/lib/supabase/public";
import { PAGES } from "@/lib/info-pages";
import { ORIGINALES_ENABLED, isOriginales, originalesPath } from "@/features/originales/config";

export const revalidate = 3600;

interface SitemapPage {
  path: string;
  seoType?: string;
  slug?: string;
  fixedCanonical?: boolean;
  images?: string[];
  lastModified?: Date;
}
interface SeoRule {
  page_type: string;
  slug: string;
  robots: string | null;
  canonical: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, products, collections, seoResult] = await Promise.all([
    getBlogs(), getProducts(), getCollections(),
    createPublicClient().from("page_seo").select("page_type,slug,robots,canonical"),
  ]);
  // The SEO table is optional only while its migration is pending.
  if (seoResult.error && !["PGRST205", "42P01"].includes(seoResult.error.code)) throw seoResult.error;
  const rules = new Map(((seoResult.data ?? []) as SeoRule[]).map(row => [row.page_type + ":" + row.slug, row]));
  const origin = getSitemapOrigin();
  const pages: SitemapPage[] = [
    { path: "/", seoType: "home" },
    { path: "/collections", seoType: "collections" },
    { path: "/collection/all", seoType: "collection", slug: "all" },
    { path: "/find-your-scent", seoType: "find-your-scent" },
    { path: "/gifts", seoType: "gifts" },
    { path: "/private-label", seoType: "private-label" },
    { path: "/locate-us", seoType: "locate-us" },
    { path: "/posts", seoType: "blog", fixedCanonical: true },
    ...Object.keys(PAGES).filter(slug => !["wishlist", "sitemap"].includes(slug)).map(slug => ({
      path: "/pages/" + slug, seoType: "info", slug,
    })),
    ...(ORIGINALES_ENABLED ? [{ path: "/originales" }] : []),
    ...products.map(product => ({
      path: isOriginales(product) ? originalesPath(product) : "/product/" + encodeURIComponent(product.slug),
      seoType: isOriginales(product) ? undefined : "product",
      slug: product.slug, images: product.images,
    })),
    ...collections.filter(collection => !(
      (ORIGINALES_ENABLED && collection.slug === "originales") ||
      ["holy-odh", "misk-al-ghazaal-from-manufacturer"].includes(collection.slug)
    )).map(collection => ({
      path: "/collection/" + encodeURIComponent(collection.slug),
      seoType: "collection", slug: collection.slug,
      images: collection.image ? [collection.image] : [],
    })),
    ...posts.map(post => ({
      path: blogUrl(post), images: post.image ? [post.image] : [],
      ...(Number.isFinite(Date.parse(post.updated_at)) ? { lastModified: new Date(post.updated_at) } : {}),
    })),
  ];
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const page of pages) {
    const rule = page.seoType ? rules.get(page.seoType + ":" + (page.slug ?? "")) : undefined;
    if (rule?.robots?.toLowerCase().includes("noindex")) continue;
    const languages = Object.fromEntries(["en", "ar"].flatMap(locale => {
      const url = new URL((locale === "ar" ? "/ar" : "") + page.path, origin).href;
      if (rule?.canonical && !page.fixedCanonical && new URL(rule.canonical, origin).href !== url) return [];
      return [[locale, url]];
    }));
    const images = [...new Set((page.images ?? []).flatMap(image => {
      if (!image) return [];
      try {
        const url = new URL(image, origin);
        return ["https:", "http:"].includes(url.protocol) ? [url.href] : [];
      } catch { return []; }
    }))];
    for (const url of Object.values(languages)) {
      entries.set(url, {
        url, alternates: { languages },
        ...(page.lastModified ? { lastModified: page.lastModified } : {}),
        ...(images.length ? { images } : {}),
      });
    }
  }
  return [...entries.values()];
}
