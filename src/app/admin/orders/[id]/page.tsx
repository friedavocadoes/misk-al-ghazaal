import {AttentionReadState} from "@/components/admin/notifications";
import { getOrderAccessPath } from "@/lib/order-access";
import { OrderCustomerLink } from "@/components/admin/orders/OrderCustomerLink";
import { after } from "next/server";
import { uuid } from "@/lib/analytics/shared";
import { DEFAULT_TRACKING_URL, trackingLink } from "@/lib/order-tracking";
import { OrderDispatchFields } from "@/components/admin/orders/OrderDispatchFields";
import {
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/admin-orders-model";
import { notifyOrderUpdate } from "@/lib/order-notifications";
import { revalidatePagePaths } from "@/lib/revalidate";
import sharp from "sharp";
import Image from "next/image";
import { AdminPanel } from "@/components/admin/workspace";
import {
  adminDate,
  deliveryDetails,
  money,
  type CustomerSummary,
} from "@/lib/admin-customer";
import { statusLabel } from "@/lib/order-status";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import {
  AdminForm,
  SaveButton,
  ActionButton,
} from "@/components/admin/admin-form";
import { PrintButton } from "@/components/admin/print-button";
import { OrderStatusChip } from "@/lib/order-status";
import { logAdmin } from "@/lib/audit";

async function updateOrder(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const trackingNo = String(formData.get("tracking_no") ?? "").trim();
  const trackingUrl =
    String(formData.get("tracking_url") ?? "").trim() || DEFAULT_TRACKING_URL;
  trackingLink(trackingUrl, trackingNo);
  if (!uuid(id) || trackingNo.length > 200 || trackingUrl.length > 2048)
    throw new Error("Invalid order or tracking details");
  const patch = {
    status,
    payment_status: String(formData.get("payment_status") ?? "pending"),
    tracking_no: trackingNo,
    tracking_url: trackingUrl,
    internal_note: String(formData.get("internal_note") ?? "").slice(0, 2000),
    expected_delivery_date: String(
      formData.get("expected_delivery_date") ?? "",
    ),
    invoice_source:
      formData.get("invoice_source") === "upload" ? "upload" : "auto",
  };
  const db = createAdminClient();
  const { data, error } = await db.rpc("admin_update_order", {
    p_actor: session.userId,
    p_id: id,
    p_patch: patch,
  });
  if (error) throw new Error(error.message);
  await logAdmin(db, session, {
    category: "orders",
    action: "status",
    entity: "order",
    entityId: id,
    label: data?.[0]?.order_no ?? id,
    summary: `Updated order ${data?.[0]?.order_no ?? id}`,
    details: { changes: data, ...patch },
  });
  if (data?.[0]?.from_status !== data?.[0]?.to_status)
    after(() =>
      notifyOrderUpdate(id, formData.get("attach_invoice") === "on", status),
    );
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePagePaths("/account/orders");
  revalidatePagePaths("/account/orders/[id]");
}

async function uploadInvoice(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!uuid(id)) throw new Error("Invalid order.");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("Choose an invoice file first.");
  const okType =
    file.type === "application/pdf" ||
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp";
  if (!okType || file.size > 5 * 1024 * 1024)
    throw new Error("Use a PDF, PNG, JPEG or WebP file up to 5MB.");
  const supabase = await createClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "invoice";
  const isImage = file.type.startsWith("image/");
  const storagePath = `${id}/${Date.now()}-${isImage ? safe.replace(/\.[^.]+$/, "") + ".webp" : safe}`;
  const source = Buffer.from(await file.arrayBuffer());
  const bytes =
    isImage && file.type !== "image/webp"
      ? await sharp(source, { limitInputPixels: 40_000_000 })
          .rotate()
          .webp({ lossless: true })
          .toBuffer()
      : source;
  const { error } = await supabase.storage
    .from("invoices")
    .upload(storagePath, bytes, {
      contentType: isImage ? "image/webp" : file.type,
      upsert: false,
    });
  if (error) throw new Error(error.message);
  // Replace any previous upload for this order (one override at a time).
  const { data: prev } = await supabase
    .from("orders")
    .select("invoice_file_path")
    .eq("id", id)
    .single();
  const prevPath = (prev as { invoice_file_path?: string | null } | null)
    ?.invoice_file_path;
  const { error: saveError } = await supabase
    .from("orders")
    .update({ invoice_file_path: storagePath, invoice_source: "upload" })
    .eq("id", id)
    .select("id")
    .single();
  if (saveError) {
    await supabase.storage.from("invoices").remove([storagePath]);
    throw new Error(saveError.message);
  }
  if (prevPath && prevPath !== storagePath) {
    await supabase.storage.from("invoices").remove([prevPath]);
  }
  await logAdmin(supabase, session, {
    category: "orders",
    action: "invoice",
    entity: "order",
    entityId: id,
    label: safe,
    summary: `Uploaded invoice override (${(file.size / 1024).toFixed(0)} KB)`,
    details: { path: storagePath },
  });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePagePaths("/account/orders/[id]");
}

async function removeInvoice(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from("orders")
    .select("invoice_file_path")
    .eq("id", id)
    .single();
  const prevPath = (prev as { invoice_file_path?: string | null } | null)
    ?.invoice_file_path;
  const { error: saveError } = await supabase
    .from("orders")
    .update({ invoice_file_path: null, invoice_source: "auto" })
    .eq("id", id)
    .select("id")
    .single();
  if (saveError) throw new Error(saveError.message);
  if (prevPath) await supabase.storage.from("invoices").remove([prevPath]);
  await logAdmin(supabase, session, {
    category: "orders",
    action: "invoice",
    entity: "order",
    entityId: id,
    label: "removed",
    summary: "Removed invoice override — back to system PDF",
    details: { path: prevPath ?? null },
  });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePagePaths("/account/orders/[id]");
}

async function moveToBin(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  if (!uuid(id)) throw new Error("Invalid order.");
  if (formData.get("confirm") !== "on")
    throw new Error("Confirm moving this order to the bin.");
  const db = createAdminClient();
  const { data, error } = await db.rpc("admin_bulk_orders", {
    p_actor: session.userId,
    p_ids: [id],
    p_bin: true,
  });
  if (error) throw new Error(error.message);
  await logAdmin(db, session, {
    category: "orders",
    action: "delete",
    entity: "order",
    entityId: id,
    summary: "Moved order to recycle bin",
    details: { changes: data },
  });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/bin");
  revalidatePagePaths("/account/orders");
  revalidatePagePaths("/account/orders/[id]");
  redirect("/admin/orders");
}

export default async function OrderDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await props.params;
  if (!uuid(id)) redirect("/admin/orders");

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (orderError && orderError.code !== "PGRST116")
    throw new Error("Order could not load. Please retry.");
  if (!order) redirect("/admin/orders");
  const [
    { data: items, error: itemsError },
    { data: history, error: historyError },
  ] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (itemsError || historyError)
    throw new Error("Order items or timeline could not load. Please retry.");
  const db = createAdminClient();
  const customerOrderPath=await getOrderAccessPath(db,id).catch(()=>null);
  const [customerResult, summaryResult, productsResult, purchaseResult] =
    await Promise.all([
      order.user_id
        ? db
            .from("profiles")
            .select("id,full_name,email,role")
            .eq("id", order.user_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      order.user_id
        ? db.rpc("admin_customer_summary", {
            p_actor: session.userId,
            p_user: order.user_id,
            p_before: order.created_at,
          })
        : Promise.resolve({ data: null }),
      items?.length
        ? db
            .from("products")
            .select("slug,images")
            .in("slug", [
              ...new Set(
                items.map((it: { product_slug: string }) => it.product_slug),
              ),
            ])
        : Promise.resolve({ data: [] }),
      db
        .from("analytics_events")
        .select("session_id")
        .eq("order_id", id)
        .eq("event_type", "purchase")
        .limit(1)
        .maybeSingle(),
    ]);
  const customer = customerResult.data,
    summary = summaryResult.data as CustomerSummary | null;
  const { data: visit } = purchaseResult.data?.session_id
    ? await db
        .from("analytics_sessions")
        .select(
          "first_touch_utm,last_touch_utm,referrer_domain,device_type,created_at",
        )
        .eq("id", purchaseResult.data.session_id)
        .maybeSingle()
    : { data: null };
  const source =
    visit?.last_touch_utm?.source ||
    visit?.last_touch_utm?.referrer ||
    visit?.referrer_domain;
  const firstSource =
    visit?.first_touch_utm?.source || visit?.first_touch_utm?.referrer;
  const artwork = new Map<string, string>(
    (productsResult.data ?? []).map((p: { slug: string; images: string[] }) => [
      p.slug,
      p.images?.[0],
    ]),
  );
  const delivery = deliveryDetails(order);
  const waHref = `https://wa.me/${String(order.phone).replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${order.customer_name}, this is Misk Al Ghazaal about order ${order.order_no}.`)}`;
  const canOpenCustomer =
    customer &&
    (session.role === "super_admin" || customer.role === "customer");
  const paidRevenue =
    order.payment_status === "paid" &&
    !order.deleted_at &&
    !["cancelled", "returned"].includes(order.status);
  const units = (items ?? []).reduce(
    (n: number, it: { qty: number }) => n + it.qty,
    0,
  );
  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <main className="admin-workspace">
        {!order.deleted_at&&<AttentionReadState kind="order" id={id} showControl={false}/>} 
        <Link href="/admin/orders" className="text-xs text-fog hover:text-ink">
          ← All orders
        </Link>
        <div className="admin-workspace-header mt-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1>{order.order_no}</h1>
              <OrderStatusChip status={order.status} />
              <span
                className={`admin-tag ${order.payment_status === "paid" ? "" : "admin-tag-warn"}`}
              >
                {paymentStatusLabel(order.payment_status ?? "pending")}
              </span>
            </div>
            <p>
              {adminDate(order.created_at)} · Dubai time ·{" "}
              {order.order_source === "admin"
                ? "Created by staff"
                : "Online store"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <a
              href={`/api/orders/${id}/invoice`}
              target="_blank"
              rel="noreferrer"
              className="admin-action"
            >
              View invoice ↗
            </a>
          </div>
        </div>
        {order.deleted_at && (
          <p className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
            This order is in the recycle bin. Restore it from the bin before
            making changes.
          </p>
        )}
        <div className="admin-workspace-grid">
          <div className="admin-stack">
            <AdminPanel
              title="Order contents"
              detail={`${units} ${units === 1 ? "item" : "items"} · ${paymentMethodLabel(order.payment_method)}`}
            >
              {(items ?? []).map(
                (it: {
                  id: string;
                  title: string;
                  product_slug: string;
                  qty: number;
                  unit_price: number;
                }) => (
                  <div key={it.id} className="admin-order-line">
                    <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f6f6f2] text-xs text-fog">
                      {artwork.get(it.product_slug) ? (
                        <Image
                          src={artwork.get(it.product_slug)!}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${it.product_slug}`}
                        target="_blank"
                        className="font-medium hover:underline"
                      >
                        {it.title}
                      </Link>
                      <p className="mt-1 text-xs text-fog">
                        {money(it.unit_price)} × {it.qty}
                        {Number(it.unit_price) === 0 ? " · Complimentary" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums">
                      {money(Number(it.unit_price) * it.qty)}
                    </span>
                  </div>
                ),
              )}
              <div className="admin-ledger">
                <div>
                  <span>Subtotal</span>
                  <span>{money(order.subtotal)}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div>
                    <span>
                      Discount{" "}
                      {order.coupon_code ? `· ${order.coupon_code}` : ""}
                    </span>
                    <span>− {money(order.discount)}</span>
                  </div>
                )}
                <div>
                  <span>Delivery</span>
                  <span>
                    {Number(order.shipping) === 0
                      ? "Complimentary"
                      : money(order.shipping)}
                  </span>
                </div>
                <div>
                  <span>Total</span>
                  <span>{money(order.total)}</span>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-fog">
                Payment: {paymentStatusLabel(order.payment_status ?? "pending")}
                .{" "}
                {paidRevenue
                  ? "Included in paid revenue."
                  : "Not included in fully paid revenue."}
              </p>
            </AdminPanel>
            {!order.deleted_at && (
              <AdminPanel
                title="Fulfillment & payment"
                detail="Update the saved order, delivery estimate and courier handover."
              >
                <AdminForm
                  action={updateOrder}
                  success="Order updated"
                  className="space-y-5"
                >
                  <input type="hidden" name="id" value={id} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <OrderDispatchFields
                      key={[
                        order.status,
                        order.payment_status,
                        order.tracking_no,
                        order.tracking_url,
                      ].join("|")}
                      status={order.status}
                      trackingNo={order.tracking_no}
                      trackingUrl={order.tracking_url}
                      paymentStatus={order.payment_status ?? "pending"}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block text-xs">
                      Expected delivery
                      <input
                        type="date"
                        name="expected_delivery_date"
                        defaultValue={order.expected_delivery_date ?? ""}
                        className="mt-2 w-full border border-ink/20 px-3 py-2"
                      />
                    </label>
                    <label className="block text-xs">
                      Invoice shown to customer
                      <select
                        name="invoice_source"
                        defaultValue={order.invoice_source ?? "auto"}
                        className="mt-2 w-full border border-ink/20 bg-white px-3 py-2"
                      >
                        <option value="auto">System PDF</option>
                        {order.invoice_file_path && (
                          <option value="upload">Uploaded invoice</option>
                        )}
                      </select>
                    </label>
                  </div>
                  <label className="block text-xs">
                    Internal note · visible to staff only
                    <textarea
                      name="internal_note"
                      rows={3}
                      defaultValue={order.internal_note ?? ""}
                      maxLength={2000}
                      placeholder="Delivery preferences or support follow-up…"
                      className="mt-2 w-full border border-ink/20 px-3 py-2"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-5">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="attach_invoice" />
                      Attach invoice to status-update email
                    </label>
                    <SaveButton>Save order changes</SaveButton>
                  </div>
                  <p className="text-[11px] leading-5 text-fog">
                    Status changes send an order update when the customer has
                    email updates enabled. Saving payment or staff notes alone
                    does not send an email.
                  </p>
                </AdminForm>
              </AdminPanel>
            )}
            <AdminPanel
              title="Timeline"
              detail="Saved status changes, most recent first."
            >
              <ol>
                {(history ?? []).map(
                  (h: {
                    id: string;
                    from_status: string | null;
                    to_status: string;
                    created_at: string;
                    note?: string;
                  }) => (
                    <li key={h.id} className="admin-event">
                      <p className="font-medium">
                        {h.from_status
                          ? `${statusLabel(h.from_status)} → `
                          : ""}
                        {h.to_status === "binned"
                          ? "Moved to recycle bin"
                          : statusLabel(h.to_status)}
                      </p>
                      {h.note && <p className="mt-1 text-fog">{h.note}</p>}
                      <time dateTime={h.created_at}>
                        {adminDate(h.created_at)} · Dubai time
                      </time>
                    </li>
                  ),
                )}
                {!history?.length && (
                  <li className="text-sm text-fog">
                    No status changes recorded yet.
                  </li>
                )}
              </ol>
            </AdminPanel>
          </div>
          <aside className="admin-stack">
          <AdminPanel title="Customer order link"><OrderCustomerLink path={customerOrderPath}/></AdminPanel>
            <AdminPanel title="Customer">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eef0e8] text-lg">
                  {String(order.customer_name).slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {canOpenCustomer ? (
                      <Link
                        href={`/admin/users/${customer.id}`}
                        className="underline decoration-ink/20 underline-offset-4"
                      >
                        {order.customer_name} ↗
                      </Link>
                    ) : (
                      order.customer_name
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-fog">
                    {customer ? "Account customer" : "Guest checkout"}
                  </p>
                </div>
              </div>
              <div className="my-5">
                {summary ? (
                  <span className="admin-tag">
                    {summary.previous_orders === 0
                      ? "This is their first order"
                      : `${summary.previous_orders} earlier ${summary.previous_orders === 1 ? "order" : "orders"}`}
                  </span>
                ) : (
                  <span className="admin-tag admin-tag-warn">
                    {order.user_id
                      ? "Customer history unavailable"
                      : "Guest · no account history"}
                  </span>
                )}
              </div>
              <dl className="admin-facts">
                <div>
                  <dt>Order contact</dt>
                  <dd>
                    <a href={`tel:${order.phone}`}>{order.phone}</a>
                    {order.email && (
                      <a href={`mailto:${order.email}`} className="block">
                        {order.email}
                      </a>
                    )}
                  </dd>
                </div>
                {summary && (
                  <div>
                    <dt>Lifetime · {summary.orders} orders</dt>
                    <dd>{money(summary.paid_total)} paid</dd>
                  </div>
                )}
              </dl>
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="admin-action mt-5 w-full"
              >
                Message on WhatsApp ↗
              </a>
            </AdminPanel>
            <AdminPanel
              title="Delivery address"
              detail={order.address_label || "Address captured at checkout"}
            >
              <address className="text-sm not-italic leading-7">
                <p className="mb-1 font-medium">{order.customer_name}</p>
                {delivery.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </address>
              {delivery.mapHref && (
                <a
                  href={delivery.mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-action mt-4"
                >
                  Open Google Maps ↗
                </a>
              )}
              {delivery.coordinates && (
                <p className="mt-3 font-mono text-[10px] text-fog" dir="ltr">
                  {delivery.coordinates}
                </p>
              )}
              {order.notes && (
                <div className="mt-5 rounded-lg bg-[#faf6eb] p-4 text-xs leading-6">
                  <p className="font-medium">Customer delivery note</p>
                  <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
              {order.expected_delivery_date && (
                <p className="mt-4 text-xs text-fog">
                  Expected delivery: {order.expected_delivery_date}
                </p>
              )}
            </AdminPanel>
            <AdminPanel
              title="Conversion summary"
              detail="Based on the recorded purchase session."
            >
              <dl className="admin-facts">
                <div>
                  <dt>Checkout source</dt>
                  <dd>
                    {order.order_source === "admin"
                      ? "Staff-created order"
                      : visit
                        ? source || "Direct / untagged"
                        : "Not recorded"}
                  </dd>
                </div>
                {firstSource && (
                  <div>
                    <dt>First recorded source</dt>
                    <dd>{String(firstSource)}</dd>
                  </div>
                )}
                {visit?.last_touch_utm?.campaign && (
                  <div>
                    <dt>Campaign</dt>
                    <dd>{String(visit.last_touch_utm.campaign)}</dd>
                  </div>
                )}
                {visit && (
                  <div>
                    <dt>Device · session started</dt>
                    <dd className="capitalize">{visit.device_type}</dd>
                    <dd>{adminDate(visit.created_at)}</dd>
                  </div>
                )}
              </dl>
            </AdminPanel>
            <AdminPanel
              title="Invoice file"
              detail="Use the live system PDF or upload a replacement."
            >
              <a
                href={`/api/orders/${id}/invoice`}
                target="_blank"
                rel="noreferrer"
                className="admin-action"
              >
                Preview current invoice ↗
              </a>
              {!order.deleted_at && (
                <>
                  <AdminForm
                    action={uploadInvoice}
                    success="Invoice uploaded"
                    className="mt-5 space-y-3"
                  >
                    <input type="hidden" name="id" value={id} />
                    <label className="block text-xs">
                      PDF, PNG, JPEG or WebP · up to 5MB
                      <input
                        type="file"
                        name="file"
                        required
                        accept="application/pdf,image/png,image/jpeg,image/webp"
                        className="mt-2 w-full border border-ink/20 px-3 py-2 text-xs"
                      />
                    </label>
                    <ActionButton>Upload replacement</ActionButton>
                  </AdminForm>
                  {order.invoice_file_path && (
                    <AdminForm
                      action={removeInvoice}
                      success="System invoice restored"
                      className="mt-3"
                    >
                      <input type="hidden" name="id" value={id} />
                      <ActionButton>Remove uploaded file</ActionButton>
                    </AdminForm>
                  )}
                </>
              )}
            </AdminPanel>
            {!order.deleted_at && (
              <details className="rounded-xl border border-ink/10 p-5">
                <summary className="text-xs text-fog">Order actions</summary>
                <AdminForm action={moveToBin} className="mt-4 space-y-3">
                  <input type="hidden" name="id" value={id} />
                  <label className="flex gap-2 text-xs leading-5">
                    <input type="checkbox" required name="confirm" />
                    Move this order to the recycle bin. It will disappear from
                    the customer’s order history.
                  </label>
                  <ActionButton danger>Move to recycle bin</ActionButton>
                </AdminForm>
              </details>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
