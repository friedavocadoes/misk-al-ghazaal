import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { NotesLibrary } from "@/components/admin/notes-library";
import { AdminNav } from "@/components/admin/admin-nav";
import {
  AdminForm,
  SaveButton,
  ActionButton,
} from "@/components/admin/admin-form";
import { NoteGlyphField } from "@/components/admin/note-glyph-field";
import { DEFAULT_NOTE_GLYPH } from "@/lib/note-artwork";
import { logAdmin } from "@/lib/audit";
import { revalidateHome, touchProduct } from "@/lib/revalidate";
import { getSupabaseUrl } from "@/lib/supabase/keys";

type NoteRow = {
  is_active?: boolean;
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  color: string;
  glyph: string | null;
  description: string | null;
  description_ar: string | null;
};

function artwork(value: FormDataEntryValue | null): string {
  const src = String(value || DEFAULT_NOTE_GLYPH).trim();
  if (src === DEFAULT_NOTE_GLYPH) return src;
  const prefix = `${getSupabaseUrl()}/storage/v1/object/public/products/note-glyphs/`;
  if (
    !src.startsWith(prefix) ||
    !/\.(png|webp|avif)$/i.test(src) ||
    src.includes("..")
  )
    throw new Error("Upload glyph artwork using the upload control.");
  return src;
}

async function staff() {
  const session = await getAdminSession();
  if (!session || session.role !== "super_admin") redirect("/admin/login");
  return { session, sb: await createClient() };
}

async function refreshNotes(
  sb: Awaited<ReturnType<typeof createClient>>,
  productIds: string[] = [],
) {
  for (const id of new Set(productIds)) {
    await touchProduct(sb, id);
    revalidatePath(`/admin/products/${id}`);
  }
  revalidateHome();
  revalidatePath("/admin/notes");
}
async function linkedProducts(
  sb: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  const { data, error } = await sb
    .from("product_notes")
    .select("product_id")
    .eq("note_id", id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { product_id: string }) => row.product_id);
}
async function purgeUnused(
  sb: Awaited<ReturnType<typeof createClient>>,
  glyph?: string | null,
) {
  const prefix = `${getSupabaseUrl()}/storage/v1/object/public/products/`;
  if (!glyph?.startsWith(`${prefix}note-glyphs/`)) return;
  const { count, error } = await sb
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("glyph", glyph);
  if (!error && count === 0)
    await sb.storage.from("products").remove([glyph.slice(prefix.length)]);
}
function fields(fd: FormData) {
  const name = String(fd.get("name") || "").trim();
  if (!name) throw new Error("A note name is required.");
  const color = String(fd.get("color") || "#8a6d2f");
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Choose a valid color.");
  return {
    name,
    name_ar: String(fd.get("name_ar") || "").trim() || null,
    color,
    glyph: artwork(fd.get("glyph")),
    description: String(fd.get("description") || "").trim(),
    description_ar: String(fd.get("description_ar") || "").trim() || null,
  };
}
async function createNote(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const payload = fields(fd);
  const slug = String(fd.get("slug") || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error("Use lowercase letters, numbers and hyphens for the slug.");
  const { data, error } = await sb
    .from("notes")
    .insert({ ...payload, slug })
    .select("id")
    .single();
  if (error)
    throw new Error(
      error.message.includes("glyph")
        ? "Run supabase/migration_add_glyphs.sql before saving glyph artwork."
        : error.message,
    );
  await logAdmin(sb, session, {
    category: "notes",
    action: "create",
    entity: "note",
    entityId: data.id,
    label: payload.name,
    summary: `Added fragrance note “${payload.name}”`,
    details: payload,
  });
  await refreshNotes(sb);
}
async function saveNote(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const id = String(fd.get("id") || "");
  const payload = fields(fd);
  const { data: previous, error: readError } = await sb
    .from("notes")
    .select("glyph")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);
  const products = await linkedProducts(sb, id);
  const { error } = await sb.from("notes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  await logAdmin(sb, session, {
    category: "notes",
    action: "update",
    entity: "note",
    entityId: id,
    label: payload.name,
    summary: `Updated fragrance note “${payload.name}”`,
    details: payload,
  });
  await refreshNotes(sb, products);
  if (previous?.glyph !== payload.glyph) await purgeUnused(sb, previous?.glyph);
}
async function deleteNote(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const id = String(fd.get("id") || "");
  const { data, error: readError } = await sb
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);
  const products = await linkedProducts(sb, id);
  const { error } = await sb.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAdmin(sb, session, {
    category: "notes",
    action: "delete",
    entity: "note",
    entityId: id,
    label: data.name,
    summary: `Deleted fragrance note “${data.name}”`,
    details: { snapshot: data },
  });
  await refreshNotes(sb, products);
  await purgeUnused(sb, data.glyph);
}

async function bulkNotes(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const ids = [...new Set(fd.getAll("ids").map(String))];
  const operation = String(fd.get("operation"));
  if (
    !ids.length ||
    ids.length > 1000 ||
    !["delete", "enable", "disable"].includes(operation)
  )
    throw new Error("Select notes and an action.");
  const { data: before, error: readError } = await sb
    .from("notes")
    .select("*")
    .in("id", ids);
  if (readError) throw new Error(readError.message);
  const { data: links, error: linkError } = await sb
    .from("product_notes")
    .select("product_id")
    .in("note_id", ids);
  if (linkError) throw new Error(linkError.message);
  const { error } =
    operation === "delete"
      ? await sb.from("notes").delete().in("id", ids)
      : await sb
          .from("notes")
          .update({ is_active: operation === "enable" })
          .in("id", ids);
  if (error)
    throw new Error(
      error.message.includes("is_active")
        ? "Run supabase/migration_notes_active.sql first."
        : error.message,
    );
  await logAdmin(sb, session, {
    category: "notes",
    action: operation,
    entity: "note",
    label: `${ids.length} notes`,
    summary: `${operation}: ${ids.length} notes`,
    details: { snapshot: before },
  });
  await refreshNotes(
    sb,
    (links ?? []).map((row) => row.product_id),
  );
  if (operation === "delete")
    for (const note of before ?? []) await purgeUnused(sb, note.glyph);
}
async function quickNotes(fd: FormData) {
  "use server";
  const { session, sb } = await staff();
  const names = String(fd.get("names") || "")
    .split(/\r?\n/)
    .map((n) => n.trim())
    .filter(Boolean);
  if (!names.length || names.length > 50)
    throw new Error("Enter 1 to 50 names.");
  const rows = names.map((name) => ({
    name,
    slug: name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    glyph: DEFAULT_NOTE_GLYPH,
    color: "#8a6d2f",
  }));
  if (
    rows.some((r) => !r.slug) ||
    new Set(rows.map((r) => r.slug)).size !== rows.length
  )
    throw new Error(
      "Use distinct English names. Add translations in the editor.",
    );
  const { error } = await sb.from("notes").insert(rows);
  if (error)
    throw new Error(
      error.code === "23505"
        ? "A name already exists. No notes were added."
        : error.message,
    );
  await logAdmin(sb, session, {
    category: "notes",
    action: "create",
    entity: "note",
    label: `${rows.length} notes`,
    summary: `Added ${rows.length} notes`,
    details: { names },
  });
  await refreshNotes(sb);
}
const inputClass =
  "mt-1.5 w-full border border-ink/20 bg-white px-3 py-2 text-sm";
function NoteFields({ note }: { note?: NoteRow }) {
  return (
    <>
      {!note && (
        <label className="text-xs">
          Slug
          <input
            name="slug"
            required
            placeholder="vetiver"
            className={inputClass}
          />
        </label>
      )}
      <label className="text-xs">
        Name · English
        <input
          name="name"
          required
          defaultValue={note?.name}
          placeholder="Vetiver"
          className={inputClass}
        />
      </label>
      <label className="text-xs">
        Name · Arabic
        <input
          name="name_ar"
          defaultValue={note?.name_ar ?? ""}
          dir="rtl"
          className={inputClass}
        />
      </label>
      <label className="text-xs">
        Accent color
        <input
          name="color"
          type="color"
          defaultValue={note?.color ?? "#8a6d2f"}
          className="mt-1.5 block h-10 w-16 border border-ink/20 p-1"
        />
      </label>
      <div className="md:col-span-4">
        <NoteGlyphField initial={note?.glyph} noteId={note?.id} />
      </div>
      <label className="text-xs md:col-span-2">
        Definition · English
        <textarea
          name="description"
          defaultValue={note?.description ?? ""}
          rows={2}
          className={inputClass}
        />
      </label>
      <label className="text-xs md:col-span-2">
        Definition · Arabic
        <textarea
          name="description_ar"
          defaultValue={note?.description_ar ?? ""}
          dir="rtl"
          rows={2}
          className={inputClass}
        />
      </label>
    </>
  );
}
async function refreshLibrary() {
  "use server";
  const { session, sb } = await staff();
  await refreshNotes(sb);
  await logAdmin(sb, session, {
    category: "notes",
    action: "refresh",
    entity: "notes",
    summary: "Refreshed storefront notes after external import",
  });
}

export default async function NotesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const sb = await createClient();
  const { data, error } = await sb.from("notes").select("*").order("name");
  if (error) throw new Error(error.message);
  const notes = (data ?? []) as NoteRow[];
  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <h1 className="font-display text-3xl">Fragrance notes</h1>
        <AdminForm
          action={refreshLibrary}
          success="Storefront notes refreshed"
          className="mt-3"
        >
          <ActionButton>Refresh storefront</ActionButton>
        </AdminForm>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-fog">
          Your artwork library for the scent finder and product notes. Upload
          each drawing once, then assign the note to products.
        </p>
        <details className="mt-8 border border-ink/15 bg-white p-6">
          <summary className="cursor-pointer font-display text-xl">
            Add a note
          </summary>
          <AdminForm
            resetOnSuccess
            action={createNote}
            success="Note added"
            className="mt-6 grid gap-5 md:grid-cols-4"
          >
            <NoteFields />
            <SaveButton className="md:col-span-4">Add note</SaveButton>
          </AdminForm>
        </details>
        <NotesLibrary
          notes={notes}
          bulkAction={bulkNotes}
          quickAction={quickNotes}
          editors={notes.map((note) => (
            <div key={note.id}>
              <AdminForm
                action={saveNote}
                success="Note saved"
                className="grid gap-4 md:grid-cols-4"
              >
                <input type="hidden" name="id" value={note.id} />
                <NoteFields note={note} />
                <SaveButton>Save note</SaveButton>
              </AdminForm>
              <form action={deleteNote} className="mt-4">
                <input type="hidden" name="id" value={note.id} />
                <ActionButton>Delete note</ActionButton>
              </form>
            </div>
          ))}
        />
      </div>
    </>
  );
}
