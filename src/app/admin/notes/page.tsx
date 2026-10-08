import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

async function createNote(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase.from("notes").insert({
    slug: String(formData.get("slug")).trim().toLowerCase().replace(/\s+/g, "-"),
    name: String(formData.get("name")),
    name_ar: String(formData.get("name_ar") || "") || null,
    color: String(formData.get("color") || "#8a6d2f"),
    description: String(formData.get("description") || "") || "",
    description_ar: String(formData.get("description_ar") || "") || null,
  });
  revalidatePath("/admin/notes");
}

async function saveNote(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase
    .from("notes")
    .update({
      name: String(formData.get("name")),
      name_ar: String(formData.get("name_ar") || "") || null,
      color: String(formData.get("color") || "#8a6d2f"),
      description: String(formData.get("description") || "") || "",
    })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/notes");
}

async function deleteNote(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/notes");
}

export default async function NotesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const { data: notes } = await supabase.from("notes").select("*").order("name");

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl">Fragrance notes</h1>
        <p className="mt-1 text-sm text-ink/60">The library behind the PDP color dots — assign per product from the product page.</p>

        <form action={createNote} className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm md:grid-cols-4">
          <h2 className="font-display text-xl md:col-span-4">New note</h2>
          <label className="block">Slug*<input name="slug" required placeholder="vetiver" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Name EN*<input name="name" required placeholder="Vetiver" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Name AR<input name="name_ar" placeholder="نجيل الهند" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Dot color<input name="color" type="color" defaultValue="#8a6d2f" className="mt-1 h-10 w-full border border-ink/20 px-1 py-1" /></label>
          <label className="block md:col-span-4">Definition (for the future detailed-notes page)<textarea name="description" rows={2} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <button className="bg-ink px-4 py-2.5 text-white transition hover:bg-ink/85 md:col-span-4">Add note</button>
        </form>

        <ul className="mt-8 space-y-3">
          {((notes as { id: string; name: string; name_ar: string | null; color: string; description: string | null }[] | null) ?? []).map((n) => (
            <li key={n.id} className="border border-ink/10 bg-white p-4">
              <form action={saveNote} className="flex flex-wrap items-center gap-3 text-sm">
                <input type="hidden" name="id" value={n.id} />
                <span className="size-6 shrink-0 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: n.color }} />
                <input name="name" defaultValue={n.name} className="w-40 border border-ink/20 px-2 py-1.5" />
                <input name="name_ar" defaultValue={n.name_ar ?? ""} placeholder="AR" className="w-32 border border-ink/20 px-2 py-1.5" />
                <input name="color" type="color" defaultValue={n.color} className="h-9 w-14 border border-ink/20 px-1" />
                <input name="description" defaultValue={n.description ?? ""} placeholder="Definition…" className="min-w-40 flex-1 border border-ink/20 px-2 py-1.5" />
                <button className="bg-ink px-3 py-1.5 text-white">Save</button>
              </form>
              <form action={deleteNote} className="mt-2 text-right">
                <input type="hidden" name="id" value={n.id} />
                <button className="text-xs text-[#9c2b2e] hover:underline">Delete note</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
