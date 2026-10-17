import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { NoteGlyphField } from "@/components/admin/note-glyph-field";
import { DEFAULT_NOTE_GLYPH } from "@/lib/note-artwork";
import { logAdmin } from "@/lib/audit";
import { revalidateHome, touchProduct } from "@/lib/revalidate";
import { getSupabaseUrl } from "@/lib/supabase/keys";

type NoteRow = { id: string; slug: string; name: string; name_ar: string | null; color: string; glyph: string | null; description: string | null; description_ar: string | null };

function artwork(value: FormDataEntryValue | null): string {
  const src = String(value || DEFAULT_NOTE_GLYPH).trim();
  if (src === DEFAULT_NOTE_GLYPH) return src;
  const prefix = `${getSupabaseUrl()}/storage/v1/object/public/products/note-glyphs/`;
  if (!src.startsWith(prefix) || !/\.(png|webp|avif)$/i.test(src) || src.includes("..")) throw new Error("Upload glyph artwork using the upload control.");
  return src;
}

async function staff() {
  const session = await getAdminSession();
  if (!session || session.role !== "super_admin") redirect("/admin/login");
  return { session, sb: await createClient() };
}

async function refreshNotes(sb: Awaited<ReturnType<typeof createClient>>, productIds: string[] = []) {
  for (const id of new Set(productIds)) await touchProduct(sb, id);
  revalidateHome();
  revalidatePath("/admin/notes");
}
async function linkedProducts(sb: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data, error } = await sb.from("product_notes").select("product_id").eq("note_id", id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { product_id: string }) => row.product_id);
}
async function purgeUnused(sb: Awaited<ReturnType<typeof createClient>>, glyph?: string | null) {
  const prefix = `${getSupabaseUrl()}/storage/v1/object/public/products/`;
  if (!glyph?.startsWith(`${prefix}note-glyphs/`)) return;
  const { count, error } = await sb.from("notes").select("id", { count: "exact", head: true }).eq("glyph", glyph);
  if (!error && count === 0) await sb.storage.from("products").remove([glyph.slice(prefix.length)]);
}
function fields(fd: FormData) {
  const name = String(fd.get("name") || "").trim();
  if (!name) throw new Error("A note name is required.");
  const color = String(fd.get("color") || "#8a6d2f");
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Choose a valid color.");
  return { name, name_ar: String(fd.get("name_ar") || "").trim() || null, color, glyph: artwork(fd.get("glyph")), description: String(fd.get("description") || "").trim(), description_ar: String(fd.get("description_ar") || "").trim() || null };
}
async function createNote(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const payload = fields(fd);
  const slug = String(fd.get("slug") || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Use lowercase letters, numbers and hyphens for the slug.");
  const { data, error } = await sb.from("notes").insert({ ...payload, slug }).select("id").single();
  if (error) throw new Error(error.message.includes("glyph") ? "Run supabase/migration_add_glyphs.sql before saving glyph artwork." : error.message);
  await logAdmin(sb, session, { category: "notes", action: "create", entity: "note", entityId: data.id, label: payload.name, summary: `Added fragrance note “${payload.name}”`, details: payload });
  await refreshNotes(sb);
}
async function saveNote(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const id = String(fd.get("id") || "");
  const payload = fields(fd);
  const { data: previous, error: readError } = await sb.from("notes").select("glyph").eq("id", id).single();
  if (readError) throw new Error(readError.message);
  const products = await linkedProducts(sb, id);
  const { error } = await sb.from("notes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  await logAdmin(sb, session, { category: "notes", action: "update", entity: "note", entityId: id, label: payload.name, summary: `Updated fragrance note “${payload.name}”`, details: payload });
  await refreshNotes(sb, products);
  if (previous?.glyph !== payload.glyph) await purgeUnused(sb, previous?.glyph);
}
async function deleteNote(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const id = String(fd.get("id") || "");
  const { data, error: readError } = await sb.from("notes").select("*").eq("id", id).single();
  if (readError) throw new Error(readError.message);
  const products = await linkedProducts(sb, id);
  const { error } = await sb.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAdmin(sb, session, { category: "notes", action: "delete", entity: "note", entityId: id, label: data.name, summary: `Deleted fragrance note “${data.name}”`, details: { snapshot: data } });
  await refreshNotes(sb, products);
  await purgeUnused(sb, data.glyph);
}

const inputClass = "mt-1.5 w-full border border-ink/20 bg-white px-3 py-2 text-sm";
function NoteFields({ note }: { note?: NoteRow }) {
  return <>
    {!note && <label className="text-xs">Slug<input name="slug" required placeholder="vetiver" className={inputClass} /></label>}
    <label className="text-xs">Name · English<input name="name" required defaultValue={note?.name} placeholder="Vetiver" className={inputClass} /></label>
    <label className="text-xs">Name · Arabic<input name="name_ar" defaultValue={note?.name_ar ?? ""} dir="rtl" className={inputClass} /></label>
    <label className="text-xs">Accent color<input name="color" type="color" defaultValue={note?.color ?? "#8a6d2f"} className="mt-1.5 block h-10 w-16 border border-ink/20 p-1" /></label>
    <div className="md:col-span-4"><NoteGlyphField initial={note?.glyph} noteId={note?.id} /></div>
    <label className="text-xs md:col-span-2">Definition · English<textarea name="description" defaultValue={note?.description ?? ""} rows={2} className={inputClass} /></label>
    <label className="text-xs md:col-span-2">Definition · Arabic<textarea name="description_ar" defaultValue={note?.description_ar ?? ""} dir="rtl" rows={2} className={inputClass} /></label>
  </>;
}
export default async function NotesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const sb = await createClient();
  const { data, error } = await sb.from("notes").select("*").order("name");
  if (error) throw new Error(error.message);
  const notes = (data ?? []) as NoteRow[];
  return <>
    <AdminNav email={session.email} role={session.role} />
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl">Fragrance notes</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-fog">Your artwork library for the scent finder and product notes. Upload each drawing once, then assign the note to products.</p>
      <details className="mt-8 border border-ink/15 bg-white p-6">
        <summary className="cursor-pointer font-display text-xl">Add a note</summary>
        <AdminForm action={createNote} success="Note added" className="mt-6 grid gap-5 md:grid-cols-4"><NoteFields /><SaveButton className="md:col-span-4">Add note</SaveButton></AdminForm>
      </details>
      <ul className="mt-8 space-y-5">
        {notes.map((note) => <li key={note.id} className="border border-ink/10 bg-white p-5 md:p-6">
          <div className="mb-5 flex items-baseline justify-between"><h2 className="font-display text-xl">{note.name}</h2><span className="text-xs text-fog">{note.slug}</span></div>
          <AdminForm action={saveNote} success="Note saved" className="grid gap-5 md:grid-cols-4"><input type="hidden" name="id" value={note.id} /><NoteFields note={note} /><SaveButton className="md:col-span-4">Save note</SaveButton></AdminForm>
          <form action={deleteNote} className="mt-3 text-end"><input type="hidden" name="id" value={note.id} /><ActionButton className="border-0 px-0 text-xs text-[#9c2b2e] hover:underline">Delete note</ActionButton></form>
        </li>)}
      </ul>
    </div>
  </>;
}
