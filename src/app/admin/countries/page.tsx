import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";

type StateRow = { en: string; ar?: string };

function parseStates(raw: string): StateRow[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [en, ar] = l.split("|").map((s) => s.trim());
      return ar ? { en, ar } : { en };
    })
    .filter((s) => s.en);
}

function formatStates(states: StateRow[]): string {
  return states.map((s) => (s.ar ? `${s.en} | ${s.ar}` : s.en)).join("\n");
}

async function saveCountry(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase
    .from("delivery_countries")
    .update({
      name_en: String(formData.get("name_en")),
      name_ar: String(formData.get("name_ar") || "") || null,
      active: formData.get("active") === "on",
      states: parseStates(String(formData.get("states") || "")),
    })
    .eq("id", String(formData.get("id")));
  revalidatePath("/admin/countries");
}

async function createCountry(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase.from("delivery_countries").insert({
    code: String(formData.get("code")).trim().toUpperCase(),
    name_en: String(formData.get("name_en")),
    name_ar: String(formData.get("name_ar") || "") || null,
    active: formData.get("active") === "on",
    states: parseStates(String(formData.get("states") || "")),
    sort: Number(formData.get("sort") || 99),
  });
  revalidatePath("/admin/countries");
}

export default async function CountriesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const { data } = await supabase.from("delivery_countries").select("*").order("sort");

  const rows = (data as {
    id: string; code: string; name_en: string; name_ar: string | null;
    active: boolean; states: StateRow[] | null;
  }[] | null) ?? [];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl">Delivery countries</h1>
        <p className="mt-1 text-sm text-ink/60">
          The checkout map + country dropdowns follow this list. Disable a country to stop deliveries there instantly.
        </p>

        <div className="mt-8 space-y-4">
          {rows.map((c) => (
            <AdminForm key={c.id} action={saveCountry} success={`${c.code} saved`} className="border border-ink/10 bg-white p-6">
              <input type="hidden" name="id" value={c.id} />
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-lg font-bold tracking-[0.1em]">{c.code}</span>
                <input name="name_en" defaultValue={c.name_en} aria-label="Name EN" className="w-48 border border-ink/20 px-3 py-2 text-sm" />
                <input name="name_ar" defaultValue={c.name_ar ?? ""} aria-label="Name AR" placeholder="AR" className="w-40 border border-ink/20 px-3 py-2 text-sm" />
                <label className="ms-auto flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={c.active} />
                  Delivering
                </label>
              </div>
              <label className="mt-3 block text-sm">
                States / regions — one per line as <code>English | Arabic</code>
                <textarea
                  name="states"
                  rows={Math.min(8, Math.max(3, (c.states?.length ?? 0) + 1))}
                  defaultValue={formatStates(c.states ?? [])}
                  dir="ltr"
                  className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono text-[13px]"
                />
              </label>
              <SaveButton className="mt-3">Save {c.code}</SaveButton>
            </AdminForm>
          ))}
        </div>

        <AdminForm action={createCountry} success="Country added" className="mt-8 grid gap-3 border border-dashed border-ink/25 bg-white p-6 text-sm md:grid-cols-4">
          <h2 className="font-display text-xl md:col-span-4">New country</h2>
          <label className="block">Code*<input name="code" required placeholder="AE" maxLength={2} className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono uppercase" /></label>
          <label className="block">Name EN*<input name="name_en" required className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Name AR<input name="name_ar" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Sort<input name="sort" type="number" defaultValue={99} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block md:col-span-4">States<textarea name="states" rows={3} placeholder={"Dubai | دبي"} dir="ltr" className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono text-[13px]" /></label>
          <label className="md:col-span-4"><input type="checkbox" name="active" defaultChecked /> Delivering</label>
          <SaveButton className="md:col-span-4">Add country</SaveButton>
        </AdminForm>
      </div>
    </>
  );
}
