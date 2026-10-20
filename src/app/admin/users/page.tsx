import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { Search, User as UserIcon } from "lucide-react";
import { logAdmin } from "@/lib/audit";

async function setRole(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const id = String(formData.get("id"));
  const role = String(formData.get("role"));
  if (id === s.userId) throw new Error("You cannot demote yourself");
  if (role !== "super_admin" && role !== "orders" && role !== "customer" && role !== "content_editor") throw new Error("Bad role");
  // Service client: profiles UPDATE policy is self-only, so staff edits go
  // through the secret key here (server action, never shipped to browsers).
  const admin = await createAdminClient();
  const { data: before } = await admin.from("profiles").select("email, role").eq("id", id).single();
  const b = (before ?? {}) as { email?: string | null; role?: string };
  const { error } = await admin.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAdmin(admin, s, {
    category: "users",
    action: "role",
    entity: "profile",
    entityId: id,
    label: b.email ?? id,
    summary: `Changed role for ${b.email ?? id}: ${b.role ?? "?"} → ${role}`,
    details: { profile_id: id, email: b.email ?? null, from: b.role ?? null, to: role },
  });
  revalidatePath("/admin/users");
}

export default async function UsersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");

  const { q } = await props.searchParams;
  const query = (q ?? "").trim();
  const supabase = await createClient();
  let req = supabase
    .from("profiles")
    .select("id, email, role, referral_code, referral_uses, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (query) req = req.ilike("email", `%${query}%`);
  const { data } = await req;
  const rows = (data as {
    id: string; email: string | null; role: string;
    referral_code: string | null; referral_uses: number; created_at: string;
  }[] | null) ?? [];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="eyebrow">Access</p>
        <h1 className="mt-1 font-display text-4xl">Users</h1>
        <p className="mt-1 text-sm text-ink/60">
          Shopper accounts + staff roles. Staff log in via the same Supabase Auth — promote them here.
        </p>

        <form action="/admin/users" method="get" className="mt-6 flex items-center gap-2 border border-ink/10 bg-white px-4 py-1.5 focus-within:border-gold">
          <Search className="size-4 shrink-0 text-fog" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by email…"
            aria-label="Search users"
            className="w-full bg-transparent py-2 text-sm text-ink placeholder:text-fog focus:outline-none"
          />
          {query && (
            <Link href="/admin/users" className="shrink-0 text-xs text-fog hover:text-ink" aria-label="Clear search">
              ✕
            </Link>
          )}
        </form>

        <ul className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
          {rows.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-4 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-cream text-espresso">
                <UserIcon className="size-5" strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium" dir="ltr">{u.email ?? "(no email)"}</span>
                <span className="mt-0.5 block font-mono text-xs text-ink/50" dir="ltr">
                  {u.referral_code ?? "—"} · {u.referral_uses} referrals · since {new Date(u.created_at).toLocaleDateString("en-AE")}
                  {u.id === session.userId ? " · you" : ""}
                </span>
              </span>
              {u.id === session.userId ? (
                <span className="border border-gold/50 bg-gold-wash/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
                  {u.role.replace("_", " ")}
                </span>
              ) : (
                <AdminForm action={setRole} success="Role updated" className="flex items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className="border border-ink/20 bg-white px-2 py-1.5 text-sm">
                    <option value="customer">customer</option>
                    <option value="content_editor">Blogs & SEO editor</option><option value="orders">orders</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                  <SaveButton>Apply</SaveButton>
                </AdminForm>
              )}
            </li>
          ))}
        </ul>
        {!rows.length && (
          <p className="mt-6 border border-dashed border-ink/20 p-8 text-center text-sm text-fog">
            No users found.
          </p>
        )}
      </div>
    </>
  );
}
