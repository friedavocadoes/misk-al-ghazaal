import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import {
  AdminForm,
  SaveButton,
  ActionButton,
} from "@/components/admin/admin-form";
import { AdminMetric, AdminPanel } from "@/components/admin/workspace";
import {
  adminDate,
  money,
  isAccountBanned,
  canManageCustomer,
  type CustomerSummary,
} from "@/lib/admin-customer";
import { OrderStatusChip } from "@/lib/order-status";
import { uuid } from "@/lib/analytics/shared";
import { manageUser } from "../actions";
export default async function CustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await getAdminSession();
  if (!staff) redirect("/admin/login");
  const { id } = await params;
  if (!uuid(id)) notFound();
  const db = createAdminClient();
  const { data: profile, error } = await db
    .from("profiles")
    .select("id,email,full_name,phone,avatar_url,role,created_at")
    .eq("id", id)
    .single();
  if (error || !profile) notFound();
  if (staff.role !== "super_admin" && profile.role !== "customer")
    redirect("/admin/orders");
  const [summaryResult, ordersResult, authResult] = await Promise.all([
    db.rpc("admin_customer_summary", { p_actor: staff.userId, p_user: id }),
    db
      .from("orders")
      .select(
        "id,order_no,created_at,total,status,payment_status,payment_method",
      )
      .eq("user_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    staff.role === "super_admin"
      ? db.auth.admin.getUserById(id)
      : Promise.resolve(null),
  ]);
  const summary = summaryResult.data as CustomerSummary | null,
    account = authResult?.data.user;
  const banned = isAccountBanned(account?.banned_until);
  const manageable =
    staff.role === "super_admin" &&
    canManageCustomer(staff.userId, id, profile.role);
  const emailProvider = account?.identities?.some(
    (identity) => identity.provider === "email",
  );
  return (
    <>
      <AdminNav email={staff.email} role={staff.role} />
      <main className="admin-workspace">
        <Link
          href={staff.role === "super_admin" ? "/admin/users" : "/admin/orders"}
          className="text-xs text-fog hover:text-ink"
        >
          ← {staff.role === "super_admin" ? "Customers & staff" : "Orders"}
        </Link>
        <div className="admin-workspace-header mt-5">
          <div className="flex items-center gap-4">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eaece3] text-xl">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                (profile.full_name || profile.email).slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <h1>{profile.full_name || profile.email}</h1>
              <p>
                {profile.email} · Joined {adminDate(profile.created_at)}
              </p>
            </div>
          </div>
          <span className={`admin-tag ${banned ? "admin-tag-danger" : ""}`}>
            {banned ? "Sign-in banned" : profile.role.replaceAll("_", " ")}
          </span>
        </div>
        <div className="admin-metrics">
          <AdminMetric
            label="Orders"
            value={summary?.orders ?? "—"}
            detail="Excludes recycle bin"
          />
          <AdminMetric
            label="Paid spending"
            value={summary ? money(summary.paid_total) : "—"}
            detail="Fully paid · excludes cancellations & returns"
          />
          <AdminMetric
            label="Latest order"
            value={
              summary?.latest_order
                ? new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeZone: "Asia/Dubai",
                  }).format(new Date(summary.latest_order))
                : "No orders"
            }
          />
        </div>
        {summaryResult.error && (
          <p role="alert" className="mb-4 text-sm text-red-800">
            Customer statistics unavailable. Apply
            migration_admin_customer_workspace.sql.
          </p>
        )}
        <div className="admin-workspace-grid">
          <div className="admin-stack">
            <AdminPanel
              title="Order history"
              detail="The most recent 50 orders for this account."
            >
              {ordersResult.error ? (
                <p role="alert">Order history could not load. Please retry.</p>
              ) : (
                <div className="divide-y divide-ink/10">
                  {ordersResult.data?.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm hover:text-gold"
                    >
                      <div>
                        <span className="font-medium">{order.order_no}</span>
                        <span className="mt-1 block text-xs text-fog">
                          {adminDate(order.created_at)}
                        </span>
                      </div>
                      <OrderStatusChip status={order.status} />
                      <div className="text-right">
                        {money(order.total)}
                        <span className="mt-1 block text-xs text-fog">
                          {order.payment_status?.replaceAll("_", " ") ??
                            "pending"}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {!ordersResult.data?.length && (
                    <p className="py-6 text-sm text-fog">
                      This account has not placed an order yet.
                    </p>
                  )}
                </div>
              )}
            </AdminPanel>
            {staff.role === "super_admin" && staff.userId !== id && (
              <AdminPanel
                title="Workspace access"
                detail="Customers shop normally. Staff roles grant access to the admin workspace."
              >
                <AdminForm
                  action={manageUser}
                  success="Access updated"
                  className="flex flex-wrap gap-3"
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="mode" value="role" />
                  <select
                    aria-label="Account role"
                    name="role"
                    defaultValue={profile.role}
                    className="flex-1 border border-ink/20 bg-white px-3 text-sm"
                  >
                    <option value="customer">Customer</option>
                    <option value="orders">Orders staff</option>
                    <option value="content_editor">Blogs & SEO editor</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                  <SaveButton>Save access</SaveButton>
                </AdminForm>
              </AdminPanel>
            )}
          </div>
          <aside className="admin-stack">
            <AdminPanel title="Contact & account">
              <dl className="admin-facts">
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a
                      href={`mailto:${profile.email}`}
                      className="underline decoration-ink/20 underline-offset-4"
                    >
                      {profile.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    {profile.phone ? (
                      <a href={`tel:${profile.phone}`}>{profile.phone}</a>
                    ) : (
                      "Not saved"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>First order</dt>
                  <dd>{adminDate(summary?.first_order)}</dd>
                </div>
                {account && (
                  <>
                    <div>
                      <dt>Last sign-in</dt>
                      <dd>{adminDate(account.last_sign_in_at)}</dd>
                    </div>
                    <div>
                      <dt>Sign-in methods</dt>
                      <dd>
                        {account.identities
                          ?.map((i) => i.provider)
                          .join(", ") || "Not recorded"}
                      </dd>
                    </div>
                  </>
                )}
                <div>
                  <dt>Account ID</dt>
                  <dd className="font-mono text-[10px]">{id}</dd>
                </div>
              </dl>
            </AdminPanel>
            {manageable && (
              <AdminPanel
                title="Account support"
                detail="Customer-only actions. Every change is recorded in the audit log."
              >
                {emailProvider ? (
                  <AdminForm
                    action={manageUser}
                    success="Password reset email requested"
                    className="space-y-3 border-b border-ink/10 pb-5"
                  >
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="mode" value="reset" />
                    <p className="text-xs leading-6 text-fog">
                      Send a secure link so the customer can choose their own
                      password.
                    </p>
                    <label className="flex gap-2 text-xs">
                      <input type="checkbox" name="confirm" required />
                      Send reset email to {profile.email}
                    </label>
                    <ActionButton>Send password reset</ActionButton>
                  </AdminForm>
                ) : (
                  <p className="mb-5 text-xs leading-6 text-fog">
                    Google accounts manage their passwords with Google.
                  </p>
                )}
                <AdminForm
                  action={manageUser}
                  success={
                    banned
                      ? "Customer sign-in restored"
                      : "Customer sign-in banned"
                  }
                  className="mt-5 space-y-3"
                >
                  <input type="hidden" name="id" value={id} />
                  <input
                    type="hidden"
                    name="mode"
                    value={banned ? "unban" : "ban"}
                  />
                  <p className="text-xs leading-6 text-fog">
                    {banned
                      ? "Allow this customer to sign in again."
                      : "Block new sign-ins and refreshes. Existing access tokens may remain valid until they expire."}
                  </p>
                  <label className="flex gap-2 text-xs">
                    <input type="checkbox" name="confirm" required />
                    Confirm {banned ? "restore access" : "ban account"}
                  </label>
                  <ActionButton danger={!banned}>
                    {banned ? "Restore sign-in" : "Ban sign-in"}
                  </ActionButton>
                </AdminForm>
                <details className="mt-6 border-t border-ink/10 pt-5">
                  <summary className="text-xs font-medium text-red-800">
                    Delete customer account
                  </summary>
                  <AdminForm action={manageUser} className="mt-4 space-y-3">
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="mode" value="delete" />
                    <p className="text-xs leading-6 text-fog">
                      Permanently deletes sign-in, profile, saved items and
                      reviews. Order records are retained with their original
                      delivery details. This cannot be undone.
                    </p>
                    <label className="block text-xs">
                      Type customer email
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder={profile.email}
                        className="mt-2 w-full border border-ink/20 px-3 py-2"
                      />
                    </label>
                    <label className="flex gap-2 text-xs">
                      <input type="checkbox" name="confirm" required />
                      Permanently delete this account
                    </label>
                    <ActionButton danger>Delete account</ActionButton>
                  </AdminForm>
                </details>
              </AdminPanel>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
