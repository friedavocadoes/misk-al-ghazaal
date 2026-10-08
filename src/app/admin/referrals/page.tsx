import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

async function saveSettings(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  await supabase
    .from("referral_settings")
    .update({
      percent: Math.min(90, Math.max(0, Number(formData.get("percent") || 25))),
      active: formData.get("active") === "on",
    })
    .eq("id", 1);
  revalidatePath("/admin/referrals");
}

export default async function ReferralsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const [{ data: settings }, { data: rows }] = await Promise.all([
    supabase.from("referral_settings").select("*").eq("id", 1).single(),
    supabase.from("referrals").select("id, referee_email, status, created_at, coupons!referrals_reward_coupon_id_fkey(code)").order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-display text-3xl">Referrals</h1>
        <p className="mt-1 text-sm text-ink/60">
          The newcomer saves on their first order; the referrer is minted a personal single-use coupon automatically.
        </p>

        <form action={saveSettings} className="mt-8 flex flex-wrap items-end gap-4 border border-ink/10 bg-white p-6 text-sm">
          <label className="block">Reward % (both sides)<input name="percent" type="number" step="0.5" min={0} max={90} defaultValue={settings?.percent ?? 25} className="mt-1 w-32 border border-ink/20 px-3 py-2" /></label>
          <label className="pb-2.5"><input type="checkbox" name="active" defaultChecked={settings?.active ?? true} /> Program active</label>
          <button className="bg-ink px-4 py-2.5 text-white transition hover:bg-ink/85">Save</button>
        </form>

        <h2 className="mt-10 font-display text-xl">Introductions</h2>
        <ul className="mt-4 divide-y divide-ink/10 border border-ink/10 bg-white text-sm">
          {((rows as { id: string; referee_email: string; status: string; created_at: string; coupons: { code: string } | null }[] | null) ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <span>{r.referee_email}</span>
              <span className="font-mono text-xs text-ink/60">reward {r.coupons?.code ?? "—"}</span>
              <span className="ms-auto text-xs uppercase tracking-[0.16em] text-[#1e7a46]">{r.status}</span>
              <span className="text-xs text-ink/50">{new Date(r.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
