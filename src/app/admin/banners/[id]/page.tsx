import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateHome } from "@/lib/revalidate";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { BannerImageField } from "@/components/admin/banner-image-field";
import { logAdmin } from "@/lib/audit";

async function saveBanner(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const text = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  await supabase
    .from("banners")
    .update({
      slot: String(formData.get("slot") ?? "hero"),
      sort: Number(formData.get("sort") ?? 0),
      alt: String(formData.get("alt") ?? ""),
      eyebrow: text("eyebrow"),
      eyebrow_ar: text("eyebrow_ar"),
      title: text("title"),
      title_ar: text("title_ar"),
      desc: text("desc"),
      desc_ar: text("desc_ar"),
      cta: text("cta"),
      cta_ar: text("cta_ar"),
      href: text("href"),
      fit: String(formData.get("fit") ?? "") || null,
      focal: text("focal"),
    })
    .eq("id", String(formData.get("id")));
  await logAdmin(supabase, s, {
    category: "banners",
    action: "update",
    entity: "banner",
    entityId: String(formData.get("id")),
    label: text("title") ?? `[${String(formData.get("slot") ?? "hero")}]`,
    summary: `Updated banner copy “${text("title") ?? String(formData.get("id"))}”`,
    details: { slot: String(formData.get("slot") ?? "hero"), sort: Number(formData.get("sort") ?? 0) },
  });
  revalidatePath("/admin/banners");
  revalidatePath(`/admin/banners/${String(formData.get("id"))}`);
  revalidateHome();
}

async function revalidateHomeAction(bannerId: string, field: string) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data: b } = await supabase.from("banners").select("slot, title").eq("id", bannerId).single();
  const row = (b ?? {}) as { slot?: string; title?: string | null };
  await logAdmin(supabase, s, {
    category: "banners",
    action: "update",
    entity: "banner_artwork",
    entityId: bannerId,
    label: row.title ?? `[${row.slot ?? "?"}]`,
    summary: `Updated banner artwork (${field})`,
    details: { banner_id: bannerId, field },
  });
  revalidatePath(`/admin/banners/${bannerId}`);
  revalidateHome();
}

async function moveToBin(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const { data: doomed } = await supabase.from("banners").select("slot, title").eq("id", String(formData.get("id"))).single();
  const d = (doomed ?? {}) as { slot?: string; title?: string | null };
  await supabase
    .from("banners")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  await logAdmin(supabase, s, {
    category: "banners",
    action: "delete",
    entity: "banner",
    entityId: String(formData.get("id")),
    label: d.title ?? `[${d.slot ?? "?"}]`,
    summary: `Moved banner “${d.title ?? String(formData.get("id"))}” to the bin`,
    details: { id: String(formData.get("id")), slot: d.slot ?? null },
  });
  revalidatePath("/admin/banners");
  revalidateHome();
  redirect("/admin/banners");
}

function Field({
  name,
  label,
  defaultValue,
  type,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      <input
        name={name}
        type={type ?? "text"}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="mt-1 w-full border border-ink/20 px-3 py-2"
      />
    </label>
  );
}

export default async function BannerDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("banners")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!b) redirect("/admin/banners");

  const isHero = b.slot === "hero";
  const heroAlign =
    String(b.eyebrow ?? "").trim().toLowerCase() === "center"
      ? "center"
      : "bottom-left";

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">
              <Link href="/admin/banners" className="link-underline">
                Banners
              </Link>{" "}
              / [{b.slot} #{b.sort}]
            </p>
            <h1 className="font-display text-3xl">{b.title ?? "(untitled)"}</h1>
          </div>
          <form action={moveToBin}>
            <input type="hidden" name="id" value={b.id} />
            <ActionButton danger>Delete</ActionButton>
          </form>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="space-y-4 border border-ink/10 bg-white p-6">
            <h2 className="font-display text-xl">Artwork</h2>
            <BannerImageField
              bannerId={b.id}
              field="src"
              label="Image (src)"
              initial={b.src ?? ""}
              revalidate={revalidateHomeAction}
            />
            <BannerImageField
              bannerId={b.id}
              field="fallback"
              label="Fallback (shown if src 404s)"
              initial={b.fallback ?? ""}
              revalidate={revalidateHomeAction}
            />
          </section>

          <AdminForm
            action={saveBanner}
            success="Banner saved"
            className="space-y-3 border border-ink/10 bg-white p-6"
          >
            <input type="hidden" name="id" value={b.id} />
            <h2 className="font-display text-xl">Copy + placement</h2>
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm">
                Slot
                <select
                  name="slot"
                  defaultValue={b.slot}
                  className="mt-1 w-full border border-ink/20 bg-white px-3 py-2"
                >
                  <option value="hero">hero (fullscreen slider)</option>
                  <option value="brand">brand (Worlds card)</option>
                </select>
              </label>
              <label className="block text-sm">
                Order
                <input
                  name="sort"
                  type="number"
                  defaultValue={b.sort}
                  className="mt-1 w-full border border-ink/20 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Fit
                <select
                  name="fit"
                  defaultValue={b.fit ?? ""}
                  className="mt-1 w-full border border-ink/20 bg-white px-3 py-2"
                >
                  <option value="">auto (cover)</option>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                </select>
              </label>
            </div>

            {isHero ? (
              <label className="block text-sm">
                Text Position on Banner
                <select
                  name="eyebrow"
                  defaultValue={heroAlign}
                  className="mt-1 w-full border border-ink/20 bg-white px-3 py-2"
                >
                  <option value="bottom-left">Bottom-Left Corner</option>
                  <option value="center">Dead Center</option>
                </select>
                <span className="mt-1 block text-xs text-ink/55">
                  Hero banners show a single line of text (Title) and an optional button.
                </span>
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  name="eyebrow"
                  label="Card Subtitle / Eyebrow (EN)"
                  defaultValue={b.eyebrow}
                  placeholder="Signature Parfums & Pure Misk"
                />
                <Field
                  name="eyebrow_ar"
                  label="Card Subtitle / Eyebrow (AR)"
                  defaultValue={b.eyebrow_ar}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field
                name="title"
                label={isHero ? "Single-Line Text (EN)" : "World Title (EN)"}
                defaultValue={b.title}
              />
              <Field
                name="title_ar"
                label={isHero ? "Single-Line Text (AR)" : "World Title (AR)"}
                defaultValue={b.title_ar}
              />
              {!isHero && (
                <>
                  <Field
                    name="desc"
                    label="Description (EN — optional)"
                    defaultValue={b.desc}
                  />
                  <Field
                    name="desc_ar"
                    label="Description (AR — optional)"
                    defaultValue={b.desc_ar}
                  />
                </>
              )}
              <Field
                name="cta"
                label="Optional Button (EN)"
                defaultValue={b.cta}
              />
              <Field
                name="cta_ar"
                label="Optional Button (AR)"
                defaultValue={b.cta_ar}
              />
            </div>

            <Field
              name="href"
              label="Optional Button / Card Link"
              defaultValue={b.href}
              placeholder="/collection/…"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field name="alt" label="Alt text" defaultValue={b.alt} />
              <Field
                name="focal"
                label="Image Focal Point (e.g. center)"
                defaultValue={b.focal}
              />
            </div>

            <SaveButton className="w-full">Save banner</SaveButton>
          </AdminForm>
        </div>
      </div>
    </>
  );
}
