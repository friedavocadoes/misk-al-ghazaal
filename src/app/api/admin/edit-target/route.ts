import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

/** Resolve the storefront path to its admin editor for the edit bar.
    Products → product editor; everything editable → SEO editor;
    functional pages (cart/checkout/account) → nothing. */
export async function GET(req: Request) {
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") return NextResponse.json({});
  const raw = new URL(req.url).searchParams.get("path") ?? "";
  const path = raw.replace(/^\/ar(?=\/|$)/, "") || "/";
  const supabase = await createClient();
  const seo = (type: string, slug: string, label: string) => ({
    href: `/admin/seo/edit?type=${type}&slug=${encodeURIComponent(slug)}`,
    label,
  });

  let m = path.match(/^\/product\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const { data } = await supabase.from("products").select("id, title").eq("slug", slug).single();
    if (!data) return NextResponse.json({});
    const p = data as { id: string; title: string };
    return NextResponse.json({ href: `/admin/products/${p.id}`, label: `Product · ${p.title}` });
  }
  m = path.match(/^\/collection\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const { data } = await supabase.from("collections").select("title").eq("slug", slug).single();
    return NextResponse.json(seo("collection", slug, `Collection · ${(data as { title?: string } | null)?.title ?? slug}`));
  }
  m = path.match(/^\/blog\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const { data } = await supabase.from("articles").select("title").eq("slug", slug).single();
    return NextResponse.json(seo("article", slug, `Article · ${(data as { title?: string } | null)?.title ?? slug}`));
  }
  m = path.match(/^\/pages\/([^/]+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    return NextResponse.json(seo("info", slug, `Page · ${slug}`));
  }
  const staticSeo: Record<string, { type: string; slug: string; label: string }> = {
    "/": { type: "home", slug: "", label: "Homepage" },
    "/collections": { type: "collections", slug: "", label: "Collections index" },
    "/blog": { type: "blog", slug: "", label: "Journal index" },
    "/search": { type: "search", slug: "", label: "Search" },
    "/private-label": { type: "private-label", slug: "", label: "Private label" },
    "/locate-us": { type: "locate-us", slug: "", label: "Locate us" },
  };
  const hit = staticSeo[path];
  if (hit) return NextResponse.json(seo(hit.type, hit.slug, hit.label));
  return NextResponse.json({});
}
