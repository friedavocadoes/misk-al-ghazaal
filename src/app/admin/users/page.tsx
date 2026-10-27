import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMetric } from "@/components/admin/workspace";
import { adminDate, money, isAccountBanned } from "@/lib/admin-customer";
import { Search, ArrowUpRight } from "lucide-react";
interface DirectoryRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  banned_until: string | null;
  orders: number;
  paid_total: number;
}
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const staff = await getAdminSession();
  if (!staff) redirect("/admin/login");
  if (staff.role !== "super_admin") redirect("/admin/orders");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 150),
    role = ["customer", "orders", "content_editor", "super_admin"].includes(
      params.role ?? "",
    )
      ? params.role!
      : "";
  const page = Math.max(
    1,
    Math.min(100000, parseInt(params.page ?? "1", 10) || 1),
  );
  const { data, error } = await createAdminClient().rpc(
    "admin_customer_directory",
    { p_actor: staff.userId, p_query: q, p_role: role, p_page: page },
  );
  const rows = (data?.rows ?? []) as DirectoryRow[];
  const pageHref = (n: number) =>
    `/admin/users?${new URLSearchParams({ q, role, page: String(n) })}`;
  return (
    <>
      <AdminNav email={staff.email} role={staff.role} />
      <main className="admin-workspace">
        <div className="admin-workspace-header">
          <div>
            <p className="eyebrow">People</p>
            <h1>Customers & staff</h1>
            <p>One place for customer history, account access and support.</p>
          </div>
          <span className="admin-tag">Super admin access</span>
        </div>
        {error ? (
          <div role="alert" className="admin-panel text-sm text-red-800">
            Customer data could not load. Apply{" "}
            <code>migration_admin_customer_workspace.sql</code> and try again.
          </div>
        ) : (
          <>
            <div className="admin-metrics">
              <AdminMetric label="Customer accounts" value={data.customers} />
              <AdminMetric label="Staff accounts" value={data.staff} />
              <AdminMetric
                label="Matching accounts"
                value={data.total}
                detail="50 accounts per page"
              />
            </div>
            <form
              action="/admin/users"
              className="mb-5 flex flex-wrap items-center gap-3"
            >
              <label className="flex min-w-48 flex-1 items-center gap-3 rounded-lg border border-ink/15 bg-white px-4">
                <Search size={16} />
                <input
                  aria-label="Search customers"
                  name="q"
                  defaultValue={q}
                  placeholder="Search name, email or phone"
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
              </label>
              <select
                aria-label="Account role"
                name="role"
                defaultValue={role}
                className="border border-ink/15 bg-white px-3 text-sm"
              >
                <option value="">All accounts</option>
                <option value="customer">Customers</option>
                <option value="orders">Orders staff</option>
                <option value="content_editor">Content editors</option>
                <option value="super_admin">Super admins</option>
              </select>
              <button className="admin-action">Search</button>
              {(q || role) && (
                <Link className="admin-action" href="/admin/users">
                  Clear
                </Link>
              )}
            </form>
            <div className="admin-directory-wrap">
              <table className="admin-directory">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Access</th>
                    <th>Orders</th>
                    <th>Paid spending</th>
                    <th>Joined · Dubai time</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="block font-medium hover:underline"
                        >
                          {u.full_name || u.email}
                        </Link>
                        <span className="mt-1 block text-xs text-fog">
                          {u.email}
                          {u.phone ? ` · ${u.phone}` : ""}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-tag ${isAccountBanned(u.banned_until) ? "admin-tag-danger" : ""}`}
                        >
                          {isAccountBanned(u.banned_until)
                            ? "Banned"
                            : u.role.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{u.orders}</td>
                      <td>{money(u.paid_total)}</td>
                      <td>{adminDate(u.created_at)}</td>
                      <td>
                        <Link
                          aria-label={`View ${u.full_name || u.email}`}
                          href={`/admin/users/${u.id}`}
                          className="admin-action"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="p-10 text-center text-sm text-fog">
                  No accounts match your search.
                </p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-fog">
              <span>
                Page {page} · {data.total} matching accounts
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link className="admin-action" href={pageHref(page - 1)}>
                    Previous
                  </Link>
                )}
                {page * 50 < Number(data.total) && (
                  <Link className="admin-action" href={pageHref(page + 1)}>
                    Next
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
