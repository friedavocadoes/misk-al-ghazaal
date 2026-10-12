import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

const KINDS = [
  "products_carousel",
  "product_tabs",
  "collections_grid",
  "brand_split",
  "parallax_cta",
  "story",
  "dual_feature",
  "testimonials",
  "blog_grid",
  "instagram",
  "image_banner",
] as const;

function touchHome() {
  revalidatePath("/admin/homepage");
  revalidatePath("/", "page");
  revalidatePath("/ar", "page");
}

async function createSection(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data: last } = await supabase.from("homepage_sections").select("sort").order("sort", { ascending: false }).limit(1);
  const sort = ((last as { sort: number }[] | null)?.[0]?.sort ?? 0) + 10;
  const { data, error } = await supabase
    .from("homepage_sections")
    .insert({
      kind: String(formData.get("kind") || "products_carousel"),
      title: String(formData.get("title") || "New section"),
      sort,
      active: true,
      config: {},
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  touchHome();
  redirect(`/admin/homepage/${(data as { id: string }).id}`);
}

async function moveSection(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const dir = String(formData.get("dir")) === "up" ? -1 : 1;
  const supabase = await createClient();
  const { data } = await supabase.from("homepage_sections").select("id, sort").order("sort");
  const rows = (data as { id: string; sort: number }[] | null) ?? [];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const a = rows[i]!;
  const b = rows[j]!;
  await supabase.from("homepage_sections").update({ sort: b.sort }).eq("id", a.id);
  await supabase.from("homepage_sections").update({ sort: a.sort }).eq("id", b.id);
  touchHome();
}

async function toggleSection(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data: cur } = await supabase.from("homepage_sections").select("active").eq("id", String(formData.get("id"))).single();
  await supabase
    .from("homepage_sections")
    .update({ active: !(cur as { active: boolean } | null)?.active })
    .eq("id", String(formData.get("id")));
  touchHome();
}

async function deleteSection(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase.from("homepage_sections").delete().eq("id", String(formData.get("id")));
  touchHome();
}

export default async function HomepageAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const { data } = await supabase.from("homepage_sections").select("*").order("sort");
  const rows = (data as {
    id: string; kind: string; title: string; sort: number; active: boolean;
  }[] | null) ?? [];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="eyebrow">Homepage CMS</p>
        <h1 className="mt-1 font-display text-4xl">Home screen</h1>
        <p className="mt-2 max-w-xl text-sm text-ink/60">
          Order, enable, edit and add sections — the storefront home follows this list on refresh. No deploys.
        </p>

        <AdminForm action={createSection} success="Section created" className="mt-8 flex flex-wrap items-end gap-3 border border-ink/10 bg-white p-5 text-sm">
          <label className="block">Kind
            <select name="kind" className="mt-1 border border-ink/20 bg-white px-3 py-2" defaultValue="products_carousel">
              {KINDS.map((k) => (
                <option key={k} value={k}>{k.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="block">Title
            <input name="title" placeholder="Best Sellers" className="mt-1 border border-ink/20 px-3 py-2" />
          </label>
          <SaveButton><Plus className="size-4" /> Add section</SaveButton>
        </AdminForm>

        <ul className="mt-6 space-y-3">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center gap-3 border bg-white p-4 ${r.active ? "border-ink/10" : "border-ink/10 opacity-60"}`}
            >
              <span className="font-display text-lg italic text-gold">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <Link href={`/admin/homepage/${r.id}`} className="block truncate font-medium hover:text-gold">
                  {r.title || "(untitled)"}
                </Link>
                <span className="font-mono text-xs text-ink/50">{r.kind.replaceAll("_", " ")}</span>
              </span>
              <span className="flex items-center gap-1">
                <form action={moveSection}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="dir" value="up" />
                  <ActionButton className="!border-0 !px-2" ariaLabel="Move up">
                    <ArrowUp className="size-4" />
                  </ActionButton>
                </form>
                <form action={moveSection}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="dir" value="down" />
                  <ActionButton className="!border-0 !px-2" ariaLabel="Move down">
                    <ArrowDown className="size-4" />
                  </ActionButton>
                </form>
                <form action={toggleSection}>
                  <input type="hidden" name="id" value={r.id} />
                  <ActionButton className="!border-0 !px-2" ariaLabel={r.active ? "Disable" : "Enable"}>
                    {r.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </ActionButton>
                </form>
                <form action={deleteSection}>
                  <input type="hidden" name="id" value={r.id} />
                  <ActionButton danger className="!border-0 !px-2" ariaLabel="Delete">
                    <Trash2 className="size-4" />
                  </ActionButton>
                </form>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
