import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/keys";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

const STATUSES = [
  "all",
  "new",
  "confirmed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
] as const;

export default async function OrdersPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { status } = await props.searchParams;
  const active = STATUSES.includes(status as (typeof STATUSES)[number])
    ? (status as string)
    : "all";

  let rows: {
    id: string;
    order_no: string;
    customer_name: string;
    phone: string;
    total: number;
    status: string;
    created_at: string;
  }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    let q = supabase
      .from("orders")
      .select("id,order_no,customer_name,phone,total,status,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (active !== "all") q = q.eq("status", active);
    const { data } = await q;
    rows = (data as typeof rows) ?? [];
  }

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">Orders</p>
            <h1 className="font-display text-3xl">Monitor + dispatch</h1>
          </div>
          <Link
            href="/admin/bin?tab=orders"
            className="border border-ink/20 bg-white px-4 py-2 text-sm transition hover:border-ink/50"
          >
            Recycle bin
          </Link>
        </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/orders" : `/admin/orders?status=${s}`}
            className={`border px-3 py-1.5 text-sm transition ${
              active === s
                ? "border-ink bg-ink text-white"
                : "border-ink/20 bg-white hover:border-ink/50"
            }`}
          >
            {s.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <p className="mt-6 border border-ink/10 bg-white p-4 text-sm">
          Supabase env not set — connect <code>.env</code> and run{" "}
          <code>supabase/schema.sql</code> to see live orders. See{" "}
          <code>SETUP_SUPABASE.md</code>.
        </p>
      )}

      <div className="mt-6 divide-y divide-ink/10 border border-ink/10 bg-white">
        {rows.length === 0 && (
          <p className="p-6 text-sm text-ink/60">
            No orders{active !== "all" ? ` with status “${active}”` : ""} yet.
          </p>
        )}
        {rows.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="admin-row flex items-center justify-between gap-4 p-4"
          >
            <div>
              <p className="font-medium">
                {o.order_no} · {o.customer_name}
              </p>
              <p className="text-sm text-ink/60">
                {o.phone} · {new Date(o.created_at).toLocaleString("en-AE")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">AED {Number(o.total).toFixed(2)}</p>
              <p className="text-sm text-ink/60">{o.status.replaceAll("_", " ")}</p>
            </div>
          </Link>
        ))}
        </div>
      </div>
    </>
  );
}
