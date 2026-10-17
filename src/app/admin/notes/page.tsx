import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { NOTE_GLYPH_OPTIONS, NoteGlyph } from "@/components/ui/note-glyphs";
import { logAdmin } from "@/lib/audit";

async function createNote(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const name = String(formData.get("name"));
  const glyph = String(formData.get("glyph") || "droplet");
  const payload = {
    slug: String(formData.get("slug")).trim().toLowerCase().replace(/\s+/g, "-"),
    name,
    name_ar: String(formData.get("name_ar") || "") || null,
    color: String(formData.get("color") || "#8a6d2f"),
    glyph,
    description: String(formData.get("description") || "") || "",
    description_ar: String(formData.get("description_ar") || "") || null,
  };

  let { data, error } = await supabase
    .from("notes")
    .insert(payload)
    .select("id")
    .single();

  if (error && error.message.includes("glyph")) {
    const { glyph: _omit, ...legacyPayload } = payload;
    const retry = await supabase
      .from("notes")
      .insert(legacyPayload)
      .select("id")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw new Error(error.message);
  await logAdmin(supabase, s, {
    category: "notes",
    action: "create",
    entity: "note",
    entityId: (data as { id: string } | null)?.id ?? "",
    label: name,
    summary: `Added fragrance note “${name}”`,
    details: { name, glyph },
  });
  revalidatePath("/admin/notes");
  revalidatePath("/", "layout");
}

async function saveNote(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const glyph = String(formData.get("glyph") || "droplet");
  const updatePayload = {
    name: String(formData.get("name")),
    name_ar: String(formData.get("name_ar") || "") || null,
    color: String(formData.get("color") || "#8a6d2f"),
    glyph,
    description: String(formData.get("description") || "") || "",
  };

  const { error } = await supabase
    .from("notes")
    .update(updatePayload)
    .eq("id", id);

  if (error && error.message.includes("glyph")) {
    const { glyph: _omit, ...legacyUpdate } = updatePayload;
    await supabase.from("notes").update(legacyUpdate).eq("id", id);
  }

  await logAdmin(supabase, s, {
    category: "notes",
    action: "update",
    entity: "note",
    entityId: id,
    label: String(formData.get("name")),
    summary: `Updated fragrance note “${String(formData.get("name"))}”`,
    details: {
      name: String(formData.get("name")),
      color: String(formData.get("color") || ""),
      glyph,
    },
  });
  revalidatePath("/admin/notes");
  revalidatePath("/", "layout");
}

async function deleteNote(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data: doomed } = await supabase
    .from("notes")
    .select("slug, name")
    .eq("id", String(formData.get("id")))
    .single();
  const d = (doomed ?? {}) as { slug?: string; name?: string };
  await supabase.from("notes").delete().eq("id", String(formData.get("id")));
  await logAdmin(supabase, s, {
    category: "notes",
    action: "delete",
    entity: "note",
    entityId: String(formData.get("id")),
    label: d.name ?? d.slug ?? String(formData.get("id")),
    summary: `Deleted fragrance note “${d.name ?? d.slug ?? String(formData.get("id"))}”`,
    details: { id: String(formData.get("id")), snapshot: doomed ?? null },
  });
  revalidatePath("/admin/notes");
  revalidatePath("/", "layout");
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
        <p className="mt-1 text-sm text-ink/60">
          The library behind the PDP color dots and the Interactive Scent Alchemist — assign per product from the product editor.
        </p>

        <AdminForm
          action={createNote}
          success="Note added"
          className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm md:grid-cols-5"
        >
          <h2 className="font-display text-xl md:col-span-5">New note</h2>
          <label className="block">
            Slug*
            <input
              name="slug"
              required
              placeholder="vetiver"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Name EN*
            <input
              name="name"
              required
              placeholder="Vetiver"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Name AR
            <input
              name="name_ar"
              placeholder="نجيل الهند"
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Glyph
            <select
              name="glyph"
              defaultValue="droplet"
              className="mt-1 w-full border border-ink/20 bg-white px-3 py-2"
            >
              {NOTE_GLYPH_OPTIONS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Dot color
            <input
              name="color"
              type="color"
              defaultValue="#8a6d2f"
              className="mt-1 h-10 w-full border border-ink/20 px-1 py-1"
            />
          </label>
          <label className="block md:col-span-5">
            Definition (optional)
            <textarea
              name="description"
              rows={2}
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <SaveButton className="md:col-span-5">Add note</SaveButton>
        </AdminForm>

        <ul className="mt-8 space-y-3">
          {(
            (notes as
              | {
                  id: string;
                  name: string;
                  name_ar: string | null;
                  color: string;
                  glyph?: string | null;
                  description: string | null;
                }[]
              | null) ?? []
          ).map((n) => (
            <li key={n.id} className="border border-ink/10 bg-white p-4">
              <AdminForm
                action={saveNote}
                success="Note saved"
                className="flex flex-wrap items-center gap-3 text-sm"
              >
                <input type="hidden" name="id" value={n.id} />
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: `${n.color}18`,
                    borderColor: `${n.color}55`,
                  }}
                >
                  <NoteGlyph
                    glyph={n.glyph}
                    className="size-4"
                    style={{ color: n.color }}
                  />
                </span>
                <input
                  name="name"
                  defaultValue={n.name}
                  className="w-36 border border-ink/20 px-2 py-1.5"
                />
                <input
                  name="name_ar"
                  defaultValue={n.name_ar ?? ""}
                  placeholder="AR"
                  className="w-32 border border-ink/20 px-2 py-1.5"
                />
                <select
                  name="glyph"
                  defaultValue={n.glyph ?? "droplet"}
                  className="w-44 border border-ink/20 bg-white px-2 py-1.5"
                >
                  {NOTE_GLYPH_OPTIONS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <input
                  name="color"
                  type="color"
                  defaultValue={n.color}
                  className="h-9 w-12 border border-ink/20 px-1"
                />
                <input
                  name="description"
                  defaultValue={n.description ?? ""}
                  placeholder="Definition…"
                  className="min-w-40 flex-1 border border-ink/20 px-2 py-1.5"
                />
                <SaveButton>Save</SaveButton>
              </AdminForm>
              <form action={deleteNote} className="mt-2 text-right">
                <input type="hidden" name="id" value={n.id} />
                <ActionButton className="border-0 px-0 text-xs text-[#9c2b2e] hover:underline">
                  Delete note
                </ActionButton>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}