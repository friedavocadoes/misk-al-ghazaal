import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { SeoFields, readSeoFields, type SeoFieldValues } from "@/components/admin/seo-fields";
import {
  SEO_TYPE_LABELS,
  parseSchemaJson,
  seoPathFor,
  type SeoPageType,
} from "@/lib/seo";
import {
  revalidateCollectionPaths,
  revalidateHome,
  revalidatePagePaths,
  revalidateProductPaths,
} from "@/lib/revalidate";

const TYPES = Object.keys(SEO_TYPE_LABELS) as SeoPageType[];

async function saveSeoRow(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const type = String(formData.get("page_type"));
  const slug = String(formData.get("slug") ?? "");
  if (!(TYPES as string[]).includes(type)) throw new Error("Bad page type.");
  const supabase = await createClient();
  const f = readSeoFields(formData);
  let schemaJson: unknown = {};
  try {
    schemaJson = parseSchemaJson(f.schemaRaw);
  } catch {
    throw new Error("Schema must be valid JSON.");
  }
  const { error } = await supabase.from("page_seo").upsert(
    {
      page_type: type,
      slug,
      h1: f.h1,
      h1_ar: f.h1_ar,
      meta_title: f.meta_title,
      meta_title_ar: f.meta_title_ar,
      meta_description: f.meta_description,
      meta_description_ar: f.meta_description_ar,
      canonical: f.canonical,
      robots: f.robots,
      og_title: f.og_title,
      og_description: f.og_description,
      og_image: f.og_image,
      schema_json: schemaJson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "page_type,slug" },
  );
  if (error) throw new Error(error.message);
  // Instant storefront refresh so SEO scores can be re-checked at once.
  revalidatePath("/admin/seo");
  const t = type as SeoPageType;
  if (t === "product") revalidateProductPaths(slug);
  else if (t === "collection") revalidateCollectionPaths([slug]);
  else if (t === "home") revalidateHome();
  else revalidatePagePaths(seoPathFor(t, slug));
}

export default async function SeoEditPage(props: {
  searchParams: Promise<{ type?: string; slug?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const sp = await props.searchParams;
  const type = (sp.type ?? "") as SeoPageType;
  const slug = sp.slug ?? "";
  if (!(TYPES as string[]).includes(type)) redirect("/admin/seo");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("page_seo")
    .select("*")
    .eq("page_type", type)
    .eq("slug", slug)
    .maybeSingle();
  const path = seoPathFor(type, slug);

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">
          <Link href="/admin/seo" className="link-underline">Page SEO</Link> / {SEO_TYPE_LABELS[type]}
          {slug ? ` / ${slug}` : ""}
        </p>
        <h1 className="mt-1 font-display text-3xl">SEO · {SEO_TYPE_LABELS[type]}</h1>
        <p className="mt-2 text-sm text-ink/60">
          Storefront page:{" "}
          <a href={path} target="_blank" rel="noreferrer" className="link-underline font-mono" dir="ltr">
            {path}
          </a>{" "}
          · every field optional, empty falls back to page content.
        </p>
        <AdminForm action={saveSeoRow} success="SEO saved" className="mt-8 grid gap-4 border border-ink/10 bg-white p-6 text-sm md:grid-cols-2">
          <input type="hidden" name="page_type" value={type} />
          <input type="hidden" name="slug" value={slug} />
          <SeoFields initial={(row ?? null) as SeoFieldValues | null} />
          <SaveButton className="md:col-span-2">Save SEO</SaveButton>
        </AdminForm>
      </div>
    </>
  );
}
