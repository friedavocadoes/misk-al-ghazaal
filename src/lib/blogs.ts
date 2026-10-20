import "server-only";
import { cache } from "react";
import sanitizeHtml from "sanitize-html";
import { createPublicClient } from "./supabase/public";
export type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content_html: string;
  category_id: string;
  image: string;
  mobile_image: string;
  image_alt: string;
  author: string;
  published: boolean;
  published_at: string;
  updated_at: string;
  meta_title: string;
  meta_description: string;
  blog_categories: { name: string; slug: string };
};
export const getBlogs = cache(async (): Promise<Blog[]> => {
  const { data, error } = await createPublicClient()
    .from("blog_posts")
    .select(
      "id,title,slug,excerpt,category_id,image,mobile_image,image_alt,author,published,published_at,updated_at,meta_title,meta_description,blog_categories!inner(name,slug)",
    )
    .eq("published", true)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    throw error;
  }
  return data as unknown as Blog[];
});
export const blogUrl = (p: Blog) =>
  `/posts/${p.blog_categories.slug}/${p.slug}`;
export function cleanBlog(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "s",
      "u",
    ],
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb[a]?[\d\s,().%]+$/i],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb[a]?[\d\s,().%]+$/i],
        "text-align": [/^(left|center|right|justify)$/],
        "font-size": [/^\d+(\.\d+)?(px|pt|em|rem|%)$/],
        "font-family": [/^[a-zA-Z ,'-]+$/],
      },
    },
    allowedAttributes: {
      "*": ["style"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
export function blogContent(html: string) {
  const toc: { id: string; title: string; level: number }[] = [];
  const content = cleanBlog(html).replace(
    /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g,
    (_, level, attrs, body) => {
      const id = `section-${toc.length + 1}`;
      toc.push({
        id,
        title: sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} }),
        level: Number(level),
      });
      return `<h${Math.max(2, Number(level))} id="${id}"${attrs}>${body}</h${Math.max(2, Number(level))}>`;
    },
  );
  return { content, toc };
}

export const getBlog = cache(
  async (category: string, slug: string): Promise<Blog | null> => {
    const { data } = await createPublicClient()
      .from("blog_posts")
      .select("*,blog_categories!inner(name,slug)")
      .eq("slug", slug)
      .eq("blog_categories.slug", category)
      .eq("published", true)
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    return data as unknown as Blog | null;
  },
);
export async function getBlogRedirect(path: string) {
  const db = createPublicClient();
  const { data: r } = await db
    .from("blog_redirects")
    .select("post_id")
    .eq("path", path)
    .maybeSingle();
  if (!r) return null;
  return (await getBlogs()).find((p) => p.id === r.post_id) || null;
}
