import { revalidateNavigation } from "@/lib/revalidate";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { logAdmin } from "@/lib/audit";

async function saveRitual(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase
    .from("rituals")
    .update({
      title: String(formData.get("title")),
      title_ar: String(formData.get("title_ar") || "") || null,
      body_html: String(formData.get("body_html") || "") || "",
      body_ar: String(formData.get("body_ar") || "") || null,
      image: String(formData.get("image") || "") || "",
      video_url: String(formData.get("video_url") || "") || "",
    })
    .eq("id", String(formData.get("id")));
  await logAdmin(supabase, s, {
    category: "rituals",
    action: "update",
    entity: "ritual",
    entityId: String(formData.get("id")),
    label: String(formData.get("title")),
    summary: `Updated ritual guide “${String(formData.get("title"))}”`,
    details: { title: String(formData.get("title")) },
  });
  revalidatePath(`/admin/rituals/${String(formData.get("id"))}`);
  revalidateNavigation();
}

export default async function RitualDetail(props: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: r } = await supabase.from("rituals").select("*").eq("id", id).single();
  if (!r) redirect("/admin/rituals");

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">
          <Link href="/admin/rituals" className="link-underline">Guides</Link> / {r.slug}
        </p>
        <h1 className="font-display text-3xl">{r.title}</h1>
        <AdminForm action={saveRitual} success="Guide saved" className="mt-8 grid gap-3 border border-ink/10 bg-white p-6 text-sm">
          <input type="hidden" name="id" value={r.id} />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">Title EN<input name="title" defaultValue={r.title} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
            <label className="block">Title AR<input name="title_ar" defaultValue={r.title_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          </div>
          <label className="block">Steps / body HTML (EN)<textarea name="body_html" rows={6} defaultValue={r.body_html ?? ""} placeholder="<p>Pulse points…</p><ol><li>…</li></ol>" className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono text-[13px]" /></label>
          <label className="block">Steps / body HTML (AR)<textarea name="body_ar" rows={4} defaultValue={r.body_ar ?? ""} className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono text-[13px]" /></label>
          <label className="block">Photo URL (Storage or /theme-assets/…)<input name="image" defaultValue={r.image ?? ""} placeholder="/theme-assets/ritual-perfume.jpg" dir="ltr" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Video URL — mp4 file or YouTube/Vimeo embed URL (video wins when both set)<input name="video_url" defaultValue={r.video_url ?? ""} placeholder="https://www.youtube.com/embed/…" dir="ltr" className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <SaveButton>Save guide</SaveButton>
        </AdminForm>
      </div>
    </>
  );
}
