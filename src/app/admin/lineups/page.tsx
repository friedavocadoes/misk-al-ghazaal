import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";

async function createLineup(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase.from("lineups").insert({
    slug: String(formData.get("slug")).trim().toLowerCase().replace(/\s+/g, "-"),
    title: String(formData.get("title")),
    title_ar: String(formData.get("title_ar") || "") || null,
    description: String(formData.get("description") || "") || "",
    sort: Number(formData.get("sort") || 0),
  });
  revalidatePath("/admin/lineups");
  revalidatePath("/", "layout");
}

async function saveLineup(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase
    .from("lineups")
    .update({
      title: String(formData.get("title")),
      title_ar: String(formData.get("title_ar") || "") || null,
      sort: Number(formData.get("sort") || 0),
    })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/lineups");
  revalidatePath("/", "layout");
}

async function deleteLineup(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase.from("lineups").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/lineups");
  revalidatePath("/", "layout");
}

export default async function LineupsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const { data: rows } = await supabase.from("lineups").select("*").order("sort");
  const { data: counts } = await supabase.from("products").select("lineup_id").not("lineup_id", "is", null).is("deleted_at", null);
  const byLineup = new Map<string, number>();
  for (const p of (counts as { lineup_id: string }[] | null) ?? []) {
    byLineup.set(p.lineup_id, (byLineup.get(p.lineup_id) ?? 0) + 1);
  }

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl">Lineups</h1>
        <p className="mt-1 text-sm text-ink/60">Classify perfumes into named lines — PDP “More from the lineup” follows this.</p>

        <AdminForm action={createLineup} success="Lineup added" className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm md:grid-cols-4">
          <h2 className="font-display text-xl md:col-span-4">New lineup</h2>
          <label className="block">Slug*<input name="slug" required placeholder="maison-noir" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Title EN*<input name="title" required placeholder="Maison Noir" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Title AR<input name="title_ar" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Sort<input name="sort" type="number" defaultValue={0} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <SaveButton className="md:col-span-4">Add lineup</SaveButton>
        </AdminForm>

        <ul className="mt-8 divide-y divide-ink/10 border border-ink/10 bg-white">
          {((rows as { id: string; slug: string; title: string; title_ar: string | null; sort: number }[] | null) ?? []).map((l) => (
            <li key={l.id} className="p-4">
              <AdminForm action={saveLineup} success="Lineup saved" className="flex flex-wrap items-center gap-3 text-sm">
                <input type="hidden" name="id" value={l.id} />
                <span className="font-mono text-xs text-ink/50">/{l.slug} · {byLineup.get(l.id) ?? 0} products</span>
                <input name="title" defaultValue={l.title} className="w-48 border border-ink/20 px-2 py-1.5" />
                <input name="title_ar" defaultValue={l.title_ar ?? ""} placeholder="AR" className="w-36 border border-ink/20 px-2 py-1.5" />
                <input name="sort" type="number" defaultValue={l.sort} className="w-20 border border-ink/20 px-2 py-1.5" />
                <SaveButton>Save</SaveButton>
              </AdminForm>
              <form action={deleteLineup} className="mt-1 text-right">
                <input type="hidden" name="id" value={l.id} />
                <ActionButton className="border-0 px-0 text-xs text-[#9c2b2e] hover:underline">Delete lineup</ActionButton>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
