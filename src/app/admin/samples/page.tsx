import { SampleNotesField } from "@/components/admin/sample-notes-field";
import { logAdmin } from "@/lib/audit";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { SampleImage } from "@/components/admin/sample-image";
async function save(f: FormData) {
  "use server";
  const s = await getAdminSession();
  if (s?.role !== "super_admin") throw Error("Unauthorized");
  const db = await createClient();
  const kind = String(f.get("kind"));
  if (!["samples", "sample_categories", "sample_tiers"].includes(kind))
    throw Error("Invalid section");
  const id = String(f.get("id") || "");
  if (f.get("delete")) {
    const { error } = await db.from(kind).delete().eq("id", id);
    if (error) throw error;
  } else {
    const value: Record<string, unknown> =
      kind === "sample_tiers"
        ? {
            min_subtotal: Number(f.get("min_subtotal")),
            allowance: Number(f.get("allowance")),
          }
        : kind === "sample_categories"
          ? { name: String(f.get("name")) }
          : {
              name: String(f.get("name")),
              description: String(f.get("description") || ""),

              image: String(f.get("image") || ""),
              category_id: f.get("category_id") || null,
              stock: Number(f.get("stock")),
              active: f.get("active") === "on",
            };
    const { data: saved, error } = id
      ? await db.from(kind).update(value).eq("id", id).select("id").single()
      : await db.from(kind).insert(value).select("id").single();
    if (error) throw error;
    if (kind === "samples") {
      const { error: notesError } = await db.rpc("set_sample_notes", {
        sid: saved!.id,
        nids: [...new Set(f.getAll("note_ids").map(String))],
      });
      if (notesError) throw notesError;
    }
  }
  await logAdmin(db, s, {
    category: "products",
    action: f.get("delete") ? "delete" : id ? "update" : "create",
    entity: kind,
    entityId: id || undefined,
    summary: `Updated ${kind}`,
  });
  revalidatePath("/admin/samples");
}
export default async function Page() {
  const s = await getAdminSession();
  if (s?.role !== "super_admin") redirect("/admin/login");
  const db = await createClient();
  const [samples, categories, tiers, library, assigned] = await Promise.all([
    db.from("samples").select("*").order("name"),
    db.from("sample_categories").select("*").order("name"),
    db.from("sample_tiers").select("*").order("min_subtotal"),
    db.from("notes").select("id,name").order("name"),
    db.from("sample_notes").select("sample_id,note_id"),
  ]);
  return (
    <>
      <AdminNav email={s.email} role={s.role} />
      <main className="mx-auto max-w-5xl space-y-8 p-6">
        <h1 className="text-3xl">Complimentary samples</h1>
        <p>
          Set stock, categories and complimentary allowances. Tiers use
          merchandise subtotal before discounts and shipping; the highest
          unlocked allowance wins.
        </p>
        {samples.error && <p>Apply migration_samples.sql to enable samples.</p>}
        {assigned.error && (
          <p role="alert">
            Apply migration_sample_note_library.sql to enable sample note
            selections.
          </p>
        )}
        <section>
          <h2 className="mb-4 text-xl">Spending tiers</h2>
          {[
            ...(tiers.data || []),
            { id: "", min_subtotal: 0, allowance: 1 },
          ].map((t, i) => (
            <AdminForm
              key={t.id || i}
              action={save}
              className="my-3 flex flex-wrap gap-3"
            >
              <input type="hidden" name="kind" value="sample_tiers" />
              <input type="hidden" name="id" value={t.id} />
              <label>
                Minimum AED{" "}
                <input
                  required
                  name="min_subtotal"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={t.min_subtotal}
                  className="w-28 border p-2"
                />
              </label>
              <label>
                Samples{" "}
                <input
                  required
                  name="allowance"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={t.allowance}
                  className="w-20 border p-2"
                />
              </label>
              <ActionButton>Save tier</ActionButton>
              {t.id && (
                <button name="delete" value="1">
                  Delete
                </button>
              )}
            </AdminForm>
          ))}
        </section>
        <section>
          <h2 className="text-xl">Categories</h2>
          {[...(categories.data || []), { id: "", name: "" }].map((c, i) => (
            <AdminForm
              key={c.id || i}
              action={save}
              className="my-3 flex gap-3"
            >
              <input type="hidden" name="kind" value="sample_categories" />
              <input type="hidden" name="id" value={c.id} />
              <input
                name="name"
                required
                defaultValue={c.name}
                placeholder="Category name"
                className="border p-2"
              />
              <ActionButton>Save category</ActionButton>
              {c.id && (
                <button name="delete" value="1">
                  Delete
                </button>
              )}
            </AdminForm>
          ))}
        </section>
        <section>
          <h2 className="mb-4 text-xl">Sample library</h2>
          {[{}, ...(samples.data || [])].map((item, i) => (
            <details
              key={item.id || i}
              className="mb-4 rounded-xl border bg-white p-5"
              open={!item.id}
            >
              <summary className="cursor-pointer">
                {item.name || "Create sample"}
              </summary>
              <AdminForm action={save} className="mt-5 grid gap-4">
                <input type="hidden" name="kind" value="samples" />
                <input type="hidden" name="id" value={item.id || ""} />
                <label>
                  Name
                  <input
                    name="name"
                    required
                    defaultValue={item.name}
                    className="block w-full border p-2"
                  />
                </label>
                <label>
                  Category
                  <select
                    name="category_id"
                    defaultValue={item.category_id || ""}
                    className="block w-full border p-2"
                  >
                    <option value="">Uncategorized</option>
                    {categories.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={item.description}
                    className="block w-full border p-2"
                  />
                </label>
                <SampleNotesField
                  notes={library.data || []}
                  selected={(assigned.data || [])
                    .filter((n) => n.sample_id === item.id)
                    .map((n) => n.note_id)}
                />
                <label>
                  Available quantity
                  <input
                    name="stock"
                    type="number"
                    required
                    min="0"
                    step="1"
                    defaultValue={item.stock || 0}
                    className="block border p-2"
                  />
                </label>
                <SampleImage initial={item.image} />
                <label>
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={item.active ?? true}
                  />{" "}
                  Available to customers
                </label>
                <ActionButton>Save sample</ActionButton>
                {item.id && (
                  <button name="delete" value="1">
                    Delete sample
                  </button>
                )}
              </AdminForm>
            </details>
          ))}
        </section>
      </main>
    </>
  );
}
