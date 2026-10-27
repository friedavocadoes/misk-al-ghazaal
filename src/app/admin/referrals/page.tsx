import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { logAdmin } from "@/lib/audit";

const clampPct = (v: unknown, fb: number) => Math.min(90, Math.max(0, Number(v || fb)));
const clampCap = (v: unknown, fb: number) => {
  const s = String(v ?? "").trim();
  if (!s) return fb;
  return Math.max(0, Number(s) || 0);
};

async function saveSettings(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const row = {
    percent: clampPct(formData.get("referrer_percent"), 25),
    referrer_percent: clampPct(formData.get("referrer_percent"), 25),
    referee_percent: clampPct(formData.get("referee_percent"), 20),
    referrer_cap: clampCap(formData.get("referrer_cap"), 50),
    referee_cap: clampCap(formData.get("referee_cap"), 50),
    active: formData.get("active") === "on",
  };
  {
    const { error: mutationError } = await supabase
    .from("referral_settings")
    .update(row)
    .eq("id", 1);
    if (mutationError) throw new Error(mutationError.message);
  }
  await logAdmin(supabase, s, {
    category: "referrals",
    action: "update",
    entity: "referral_settings",
    entityId: "1",
    label: "program",
    summary: `Updated referral program (${row.referrer_percent}%→referrer, ${row.referee_percent}%→newcomer)`,
    details: row,
  });
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
  const st = (settings ?? {}) as {
    percent?: number; active?: boolean;
    referrer_percent?: number; referee_percent?: number;
    referrer_cap?: number; referee_cap?: number;
  };
  // Pending migration_coupons_v2: fall back to the legacy single percent.
  const legacy = Number(st.percent ?? 25);
  const rp = Number(st.referrer_percent ?? legacy);
  const ep = Number(st.referee_percent ?? legacy);
  const rc = Number(st.referrer_cap ?? 50);
  const ec = Number(st.referee_cap ?? 50);

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="admin-workspace admin-legacy">
        <h1 className="font-display text-3xl">Referrals</h1>
        <p className="mt-1 text-sm text-ink/60">
          Live rule: referrers earn <strong>{rp}% off, capped at Dhs {rc}</strong> (personal
          single-use coupon, minted automatically) · newcomers save{" "}
          <strong>{ep}% off, capped at Dhs {ec}</strong> on their first order.
        </p>

        <AdminForm action={saveSettings} success="Referral settings saved" className="mt-8 grid gap-4 border border-ink/10 bg-white p-6 text-sm md:grid-cols-2">
          <h2 className="font-display text-xl md:col-span-2">Referrer reward</h2>
          <label className="block">Referrer % off<input name="referrer_percent" type="number" step="0.5" min={0} max={90} defaultValue={rp} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Referrer cap AED<input name="referrer_cap" type="number" step="0.01" min={0} defaultValue={rc} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <h2 className="mt-2 font-display text-xl md:col-span-2">Newcomer reward</h2>
          <label className="block">Referee % off<input name="referee_percent" type="number" step="0.5" min={0} max={90} defaultValue={ep} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="block">Referee cap AED<input name="referee_cap" type="number" step="0.01" min={0} defaultValue={ec} className="mt-1 w-full border border-ink/20 px-3 py-2" /></label>
          <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" name="active" defaultChecked={st.active ?? true} className="size-4 accent-[#1c1917]" /> Program active</label>
          <SaveButton className="md:col-span-2">Save</SaveButton>
        </AdminForm>

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
