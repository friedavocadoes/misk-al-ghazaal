import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCollections } from "@/lib/store";
import { PAGES } from "@/app/[locale]/(storefront)/pages/[slug]/page";
import { SEO_TYPE_LABELS, seoPathFor, type SeoPageType } from "@/lib/seo";

interface Row {
  type: SeoPageType;
  slug: string;
  label: string;
}

/** Every crawlable surface gets an (optional) SEO row — products live in
    the product editor (§07), everything else edits here. */
export default async function SeoHub() {
  const session = await getAdminSession(true);
  if (!session) redirect("/admin/login");
  if (!["super_admin", "content_editor"].includes(session.role)) redirect("/admin/orders");
  const supabase = await createClient();
  const collections = await getCollections();
  const { data: rows } = await supabase.from("page_seo").select("page_type, slug");
  const filled = new Set(
    (((rows as { page_type: string; slug: string }[] | null) ?? []).map((r) => `${r.page_type}:${r.slug}`)),
  );

  const { data: products = [] } = await supabase.from("products").select("slug,title").order("title");
  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "Storefront",
      rows: [
        { type: "home", slug: "", label: "Homepage" },
        { type: "collections", slug: "", label: "Collections index" },
        { type: "search", slug: "", label: "Search" },
        { type: "private-label", slug: "", label: "Private label" },
        { type: "locate-us", slug: "", label: "Locate us" },
        { type: "blog", slug: "", label: "Blogs index" },
        { type: "find-your-scent", slug: "", label: "Find your scent" },
        { type: "gifts", slug: "", label: "Gifts" },
      ],
    },
    {
      title: "Collections",
      rows: collections.map((c) => ({ type: "collection" as SeoPageType, slug: c.slug, label: c.title })),
    },
    {
      title: "Info pages",
      rows: Object.entries(PAGES).map(([slug, p]) => ({ type: "info" as SeoPageType, slug, label: p.title })),
    },

  ];

  groups.push({title:"Product SEO",rows:(products || []).map(p=>({type:"product" as SeoPageType,slug:p.slug,label:p.title}))});

  const pill = (type: SeoPageType, slug: string) =>
    filled.has(`${type}:${slug}`) ? (
      <span className="border border-[#1e7a46]/40 bg-[#1e7a46]/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1e7a46]">
        Set
      </span>
    ) : (
      <span className="border border-ink/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">
        Auto
      </span>
    );

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <p className="eyebrow">Console / SEO</p>
        <h1 className="mt-1 font-display text-3xl">Page SEO</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Invisible crawler layer per page — H1, meta, canonical, robots, social
          cards, JSON-LD. Empty rows fall back to page content automatically.
          Product metadata can be edited below without access to catalog settings.
        </p>
        {groups.map((g) => (
          <section key={g.title} className="mt-8">
            <h2 className="font-display text-xl">{g.title}</h2>
            <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 bg-white">
              {g.rows.map((r) => (
                <li key={`${r.type}:${r.slug || "-"}`} className="flex items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.label}</span>
                    <span className="block truncate font-mono text-xs text-ink/50" dir="ltr">
                      {SEO_TYPE_LABELS[r.type]}{r.slug ? ` · /${r.slug}` : ""}
                    </span>
                  </span>
                  {pill(r.type, r.slug)}
                  <a
                    href={seoPathFor(r.type, r.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 border border-ink/20 px-3 py-1.5 text-xs transition hover:border-ink/50"
                  >
                    View
                  </a>
                  <Link
                    href={`/admin/seo/edit?type=${r.type}&slug=${encodeURIComponent(r.slug)}`}
                    className="shrink-0 bg-ink px-3 py-1.5 text-xs text-white transition hover:bg-ink/85"
                  >
                    SEO
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
