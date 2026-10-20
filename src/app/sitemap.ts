import type { MetadataRoute } from "next";
import { getBlogs, blogUrl } from "@/lib/blogs";
import { getProducts, getCollections } from "@/lib/store";
import { getSiteUrl } from "@/lib/site-url";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, products, collections] = await Promise.all([
    getBlogs(),
    getProducts(),
    getCollections(),
  ]);
  const origin = getSiteUrl();
  return [
    "/",
    "/posts",
    "/collections",
    "/pages/about",
    "/pages/contact",
    ...products.map((p) => `/product/${p.slug}`),
    ...collections.map((c) => `/collection/${c.slug}`),
  ]
    .flatMap((path) =>
      ["", "/ar"].map((locale) => ({ url: `${origin}${locale}${path}` })),
    )
    .concat(
      posts.flatMap((p) =>
        ["", "/ar"].map((locale) => ({
          url: `${origin}${locale}${blogUrl(p)}`,
          lastModified: new Date(p.updated_at),
        })),
      ),
    );
}
