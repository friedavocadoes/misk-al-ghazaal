"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateNavigation } from "@/lib/revalidate";
import { cleanBlog } from "@/lib/blogs";
import { logAdmin } from "@/lib/audit";
async function auth() {
  const s = await getAdminSession(true);
  if (!s || !["super_admin", "content_editor"].includes(s.role))
    redirect("/admin/login");
  return s;
}
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-|-$/g, "");
export async function saveCategory(f: FormData) {
  const session = await auth();
  const db = await createClient();
  const name = String(f.get("name") || "").trim();
  const key = slug(String(f.get("slug") || name));
  if (!name || !key) throw Error("Name and slug are required.");
  const { error } = await db
    .from("blog_categories")
    .insert({ name, slug: key });
  if (error) throw Error(error.message);
  await logAdmin(db, session, {
    category: "seo",
    action: "create",
    entity: "blog_category",
    summary: `Created blog category ${name}`,
  });
  revalidatePath("/admin/blogs");
  revalidateNavigation();
}
export async function saveBlog(f: FormData) {
  const session = await auth();
  const db = await createClient();
  const id = String(f.get("id") || "");
  const { data: before } = id
    ? await db
        .from("blog_posts")
        .select("image,mobile_image,content_html,published,published_at")
        .eq("id", id)
        .maybeSingle()
    : { data: null };
  const title = String(f.get("title") || "").trim();
  const key = slug(String(f.get("slug") || title));
  if (!title || !key) throw Error("Title and slug are required.");
  const row = {
    title,
    slug: key,
    category_id: String(f.get("category_id")),
    excerpt: String(f.get("excerpt") || ""),
    content_html: cleanBlog(String(f.get("content_html") || "")),
    image: String(f.get("image") || ""),
    mobile_image:
      f.get("separate") === "on" ? String(f.get("mobile_image") || "") : "",
    image_alt: String(f.get("image_alt") || ""),
    author: String(f.get("author") || "Misk Al Ghazaal"),
    published: f.get("published") === "on",
    meta_title: String(f.get("meta_title") || ""),
    meta_description: String(f.get("meta_description") || ""),
    published_at:
      f.get("published") === "on" && !before?.published
        ? new Date().toISOString()
        : before?.published_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (row.published && !row.content_html.replace(/<[^>]*>/g, "").trim())
    throw Error("Add blog content before publishing.");
  const { data, error } = id
    ? await db.from("blog_posts").update(row).eq("id", id).select("id").single()
    : await db.from("blog_posts").insert(row).select("id").single();
  if (error) throw Error(error.message);
  if (before) await purgeUnusedImages(db, before);
  await logAdmin(db, session, {
    category: "seo",
    action: id ? "update" : "create",
    entity: "blog",
    entityId: data.id,
    summary: `Saved blog ${title}`,
  });
  revalidateNavigation();
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blogs");
  redirect(`/admin/blogs/${data.id}`);
}

async function purgeUnusedImages(
  db: Awaited<ReturnType<typeof createClient>>,
  old: { image: string; mobile_image: string; content_html: string },
) {
  const urls = [
    old.image,
    old.mobile_image,
    ...Array.from(old.content_html.matchAll(/src="([^"]+)"/g), (m) => m[1]),
  ].filter(Boolean);
  const { data, error } = await db
    .from("blog_posts")
    .select("image,mobile_image,content_html,published,published_at");
  if (error) return;
  for (const url of new Set(urls)) {
    if (
      data?.some(
        (p) =>
          p.image === url ||
          p.mobile_image === url ||
          p.content_html.includes(url),
      )
    )
      continue;
    try {
      const u = new URL(url);
      const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
      const prefix = "/storage/v1/object/public/blogs/";
      if (u.origin === base.origin && u.pathname.startsWith(prefix)) {
        await db.storage
          .from("blogs")
          .remove([decodeURIComponent(u.pathname.slice(prefix.length))]);
      }
    } catch {
      /* External artwork is never deleted. */
    }
  }
}
export async function deleteBlog(f: FormData) {
  const session = await auth();
  const db = await createClient();
  const id = String(f.get("id"));
  const { data, error } = await db
    .from("blog_posts")
    .delete()
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw Error(error.message);
  await purgeUnusedImages(db, data);
  await logAdmin(db, session, {
    category: "seo",
    action: "delete",
    entity: "blog",
    entityId: id,
    summary: `Deleted blog ${data.title}`,
  });
  revalidateNavigation();
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blogs");
  redirect("/admin/blogs");
}
