import { revalidateNavigation } from "@/lib/revalidate";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { logAdmin } from "@/lib/audit";

async function createRitual(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const title = String(formData.get("title"));
  const { data, error } = await supabase.from("rituals").insert({
    slug: String(formData.get("slug")).trim().toLowerCase().replace(/\s+/g, "-"),
    title,
    title_ar: String(formData.get("title_ar") || "") || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await logAdmin(supabase, s, {
    category: "rituals",
    action: "create",
    entity: "ritual",
    entityId: (data as { id: string } | null)?.id ?? "",
    label: title,
    summary: `Created ritual guide “${title}”`,
    details: { title },
  });
  revalidatePath("/admin/rituals");
  revalidateNavigation();
}

export default async function RitualsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const { data: rituals } = await supabase.from("rituals").select("id, slug, title").order("title");
  const { data: usage } = await supabase.from("products").select("ritual_id").not("ritual_id", "is", null).is("deleted_at", null);
  const useCount = new Map<string, number>();
  for (const p of (usage as { ritual_id: string }[] | null) ?? []) {
    useCount.set(p.ritual_id, (useCount.get(p.ritual_id) ?? 0) + 1);
  }

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <h1 className="font-display text-3xl">How-to-use guides</h1>
        <p className="mt-1 text-sm text-ink/60">One guide, many perfumes — upload once, attach from any product page. Media URLs can be pasted from Storage.</p>

        <AdminForm resetOnSuccess action={createRitual} success="Guide added" className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm md:grid-cols-3">
          <h2 className="font-display text-xl md:col-span-3">New guide</h2>
          <label className="block">Slug*<input name="slug" required placeholder="how-to-wear-perfume" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Title EN*<input name="title" required placeholder="How to wear perfume" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Title AR<input name="title_ar" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <SaveButton className="md:col-span-3">Add guide</SaveButton>
        </AdminForm>

        <ul className="mt-8 divide-y divide-ink/10 border border-ink/10 bg-white">
          {((rituals as { id: string; slug: string; title: string }[] | null) ?? []).map((r) => (
            <li key={r.id}>
              <Link href={`/admin/rituals/${r.id}`} className="flex items-center gap-4 p-4 transition hover:bg-sand/60">
                <span className="font-medium">{r.title}</span>
                <span className="font-mono text-xs text-ink/50">/{r.slug}</span>
                <span className="ms-auto text-xs text-ink/50">{useCount.get(r.id) ?? 0} products</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
