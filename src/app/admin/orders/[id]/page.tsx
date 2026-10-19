import sharp from "sharp";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton, ActionButton } from "@/components/admin/admin-form";
import { PrintButton } from "@/components/admin/print-button";
import { ORDER_STATUSES, OrderStatusChip, statusLabel } from "@/lib/order-status";
import { sendMailboxMail, buildOrderEmail } from "@/lib/mailer";
import { resolveInvoiceAttachment } from "@/lib/invoice-attach";
import { wantsOrderMail } from "@/lib/email-settings";
import { logAdmin } from "@/lib/audit";

const NEXT_STATUSES = ORDER_STATUSES;

async function updateOrder(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const toStatus = String(formData.get("status") ?? "");
  const trackingNo = String(formData.get("tracking_no") ?? "").trim() || null;
  const trackingUrl = String(formData.get("tracking_url") ?? "").trim() || null;
  const internalNote = String(formData.get("internal_note") ?? "").trim() || null;
  const etaRaw = String(formData.get("expected_delivery_date") ?? "").trim();
  const eta = /^\d{4}-\d{2}-\d{2}$/.test(etaRaw) ? etaRaw : null;
  const invoiceSource = formData.get("invoice_source") === "upload" ? "upload" : "auto";
  const attachInvoice = formData.get("attach_invoice") === "on";
  if (!NEXT_STATUSES.includes(toStatus as (typeof NEXT_STATUSES)[number])) return;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("orders")
    .select("status, email, customer_name, order_no, user_id")
    .eq("id", id)
    .single();
  await supabase
    .from("orders")
    .update({ status: toStatus, tracking_no: trackingNo, tracking_url: trackingUrl, internal_note: internalNote, expected_delivery_date: eta, invoice_source: invoiceSource })
    .eq("id", id);
  await supabase.from("order_status_history").insert({
    order_id: id,
    from_status: current?.status ?? null,
    to_status: toStatus,
    changed_by: session.userId,
  });
  // Status email (skipped when unconfigured, on no-change, or when the
  // account holder switched order updates off in email preferences).
  const cur = current as { status?: string; email?: string | null; customer_name?: string; order_no?: string; user_id?: string | null } | null;
  let mailed = false;
  if (cur?.email && cur.status !== toStatus && (await wantsOrderMail(supabase, cur.user_id ?? null))) {
    const { data: full } = await supabase
      .from("orders")
      .select("total, subtotal, discount, shipping, address, city, emirate, country_code, state_name, postcode, address_label, delivery_lat, delivery_lng, coupon_code, created_at")
      .eq("id", id)
      .single();
    const { data: itemRows } = await supabase.from("order_items").select("title, qty, unit_price").eq("order_id", id);
    const f = (full ?? {}) as {
      total?: number; subtotal?: number; discount?: number; shipping?: number;
      address?: string; city?: string; emirate?: string; country_code?: string;
      state_name?: string; postcode?: string; address_label?: string;
      delivery_lat?: number | null; delivery_lng?: number | null;
      coupon_code?: string; created_at?: string;
    };
    const mail = buildOrderEmail({
      orderNo: cur.order_no ?? "",
      date: f.created_at ? new Date(f.created_at).toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" }) : "",
      statusLabel: statusLabel(toStatus),
      customerName: cur.customer_name ?? "client",
      lines: ((itemRows as { title: string; qty: number; unit_price: number }[] | null) ?? []).map((l) => ({
        title: l.title,
        qty: l.qty,
        unit: Number(l.unit_price),
      })),
      origin: "",
      subtotal: Number(f.subtotal ?? 0),
      discount: Number(f.discount ?? 0),
      shipping: Number(f.shipping ?? 0),
      total: Number(f.total ?? 0),
      addressHtml: `${f.address ?? ""}<br />${[f.city, f.state_name, f.postcode, f.country_code].filter(Boolean).join(" · ")}`,
      pinUrl: f.delivery_lat != null && f.delivery_lng != null ? `https://www.google.com/maps/search/?api=1&query=${f.delivery_lat},${f.delivery_lng}` : undefined,
      trackingNo: trackingNo ?? undefined,
      trackingUrl: trackingUrl ?? undefined,
      couponCode: f.coupon_code || undefined,
    });
    // Per-update choice: attach the current invoice (uploaded file or
    // fresh system PDF) only when the admin ticked the box. Bytes come
    // from the secret client: the invoices bucket has no direct reads
    // (it holds PII — everything flows through code-checked paths).
    const invoiceFile = attachInvoice
      ? await resolveInvoiceAttachment(await createAdminClient(), id)
      : null;
    mailed = (
      await sendMailboxMail("noreply", {
        to: cur.email,
        ...mail,
        ...(attachInvoice && invoiceFile ? { attachments: [invoiceFile] } : {}),
      })
    ).sent;
  }
  await logAdmin(supabase, session, {
    category: "orders",
    action: "status",
    entity: "order",
    entityId: id,
    label: cur?.order_no ?? id,
    summary: `Order ${cur?.order_no ?? id}: ${cur?.status ?? "?"} → ${toStatus}`,
    details: {
      from: cur?.status ?? null,
      to: toStatus,
      tracking_no: trackingNo,
      tracking_url: trackingUrl,
      expected_delivery_date: eta,
      invoice_source: invoiceSource,
      attach_invoice: attachInvoice,
      internal_note: internalNote,
      mailed,
    },
  });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

async function uploadInvoice(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const okType =
    file.type === "application/pdf" ||
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/webp";
  if (!okType || file.size > 5 * 1024 * 1024) return;
  const supabase = await createClient();
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "invoice";
  const isImage = file.type.startsWith("image/");
  const storagePath = `${id}/${Date.now()}-${isImage ? safe.replace(/\.[^.]+$/, "") + ".webp" : safe}`;
  const source = Buffer.from(await file.arrayBuffer());
  const bytes = isImage && file.type !== "image/webp"
    ? await sharp(source, { limitInputPixels: 40_000_000 }).rotate().webp({ lossless: true }).toBuffer()
    : source;
  const { error } = await supabase.storage.from("invoices").upload(storagePath, bytes, {
    contentType: isImage ? "image/webp" : file.type,
    upsert: false,
  });
  if (error) return;
  // Replace any previous upload for this order (one override at a time).
  const { data: prev } = await supabase
    .from("orders")
    .select("invoice_file_path")
    .eq("id", id)
    .single();
  const prevPath = (prev as { invoice_file_path?: string | null } | null)?.invoice_file_path;
  await supabase
    .from("orders")
    .update({ invoice_file_path: storagePath, invoice_source: "upload" })
    .eq("id", id);
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
  const prevPath = (prev as { invoice_file_path?: string | null } | null)?.invoice_file_path;
  await supabase
    .from("orders")
    .update({ invoice_file_path: null, invoice_source: "auto" })
    .eq("id", id);
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
}

async function moveToBin(formData: FormData) {
  "use server";
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: doomed } = await supabase
    .from("orders")
    .select("order_no")
    .eq("id", id)
    .single();
  await supabase
    .from("orders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  await supabase.from("order_status_history").insert({
    order_id: id,
    from_status: null,
    to_status: "binned",
    changed_by: session.userId,
    note: "Moved to recycle bin",
  });
  await logAdmin(supabase, session, {
    category: "orders",
    action: "delete",
    entity: "order",
    entityId: id,
    label: (doomed as { order_no?: string } | null)?.order_no ?? id,
    summary: `Moved order ${(doomed as { order_no?: string } | null)?.order_no ?? id} to the bin`,
    details: { order_id: id },
  });
  revalidatePath("/admin/orders");
  redirect("/admin/orders");
}

export default async function OrderDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await props.params;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (!order) redirect("/admin/orders");
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);
  const { data: history } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const waText = encodeURIComponent(
    `Hello ${order.customer_name}, this is Misk Al Ghazaal about order ${order.order_no} (AED ${Number(order.total).toFixed(2)}).`,
  );
  const waHref = `https://wa.me/${String(order.phone).replace(/\D/g, "")}?text=${waText}`;

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">
              <Link href="/admin/orders" className="link-underline">Orders</Link> /{" "}
              {order.order_no}
            </p>
            <h1 className="font-display text-3xl">
              {order.order_no} · {order.customer_name}
            </h1>
            <div className="mt-2">
              <OrderStatusChip status={order.status} />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <PrintButton />
            <form action={moveToBin}>
              <input type="hidden" name="id" value={order.id} />
              <ActionButton danger>Delete</ActionButton>
            </form>
          </div>
        </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-display text-xl">Customer + delivery</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-ink/60">Phone</dt><dd>{order.phone}</dd></div>
            <div><dt className="text-ink/60">Address</dt><dd>{order.address}, {order.city}, {order.emirate}</dd></div>
            {(order as { country_code?: string }).country_code && <div><dt className="text-ink/60">Country</dt><dd>{(order as { country_code?: string }).country_code}{" "}{(order as { state_name?: string }).state_name ? `· ${(order as { state_name?: string }).state_name}` : ""}{(order as { postcode?: string }).postcode ? ` · ${(order as { postcode?: string }).postcode}` : ""}{(order as { address_label?: string }).address_label ? ` · ${(order as { address_label?: string }).address_label}` : ""}</dd></div>}
            {(order as { delivery_lat?: number }).delivery_lat != null && (order as { delivery_lng?: number }).delivery_lng != null && (
              <div>
                <dt className="text-ink/60">Courier pin</dt>
                <dd>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${(order as { delivery_lat?: number }).delivery_lat},${(order as { delivery_lng?: number }).delivery_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="link-underline"
                    dir="ltr"
                  >
                    {(order as { delivery_lat?: number }).delivery_lat}, {(order as { delivery_lng?: number }).delivery_lng}
                  </a>
                </dd>
              </div>
            )}
            {order.email && <div><dt className="text-ink/60">Email</dt><dd>{order.email}</dd></div>}
            {order.notes && <div><dt className="text-ink/60">Customer note</dt><dd>{order.notes}</dd></div>}
            <div><dt className="text-ink/60">Payment</dt><dd>{order.payment_method === "cod" ? "Cash on delivery" : "Card"}</dd></div>
            <div><dt className="text-ink/60">Total (COD to collect)</dt><dd className="font-medium">AED {Number(order.total).toFixed(2)}</dd></div>
            <div>
              <dt className="text-ink/60">Expected delivery (shopper sees this)</dt>
              <dd>{(order as { expected_delivery_date?: string | null }).expected_delivery_date ?? "— not set"}</dd>
            </div>
          </dl>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block bg-ink px-4 py-2 text-sm text-white transition hover:bg-ink/85"
          >
            WhatsApp customer (no API cost)
          </a>
        </section>

        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-display text-xl">Items</h2>
          <ul className="mt-4 divide-y divide-ink/10 text-sm">
            {(items ?? []).map((it: { id: string; title: string; qty: number; unit_price: number }) => (
              <li key={it.id} className="flex justify-between py-2">
                <span>{it.title} × {it.qty}</span>
                <span>AED {(Number(it.unit_price) * it.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 font-display text-xl">Update status</h2>
          <AdminForm action={updateOrder} success="Order updated" className="mt-4 space-y-3">
            <input type="hidden" name="id" value={order.id} />
            <label className="block text-sm">
              Status
              <select name="status" defaultValue={order.status} className="mt-1 w-full border border-ink/20 bg-white px-3 py-2">
                {NEXT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Tracking no / courier (optional)
              <input name="tracking_no" defaultValue={order.tracking_no ?? ""} placeholder="e.g. Aramex 123456" className="mt-1 w-full border border-ink/20 px-3 py-2" />
            </label>
            <label className="block text-sm">
              Tracking link (courier URL — shopper gets a Track button)
              <input name="tracking_url" defaultValue={(order as { tracking_url?: string }).tracking_url ?? ""} placeholder="https://…" dir="ltr" className="mt-1 w-full border border-ink/20 px-3 py-2" />
            </label>
            <label className="block text-sm">
              Expected delivery date (shown to the shopper)
              <input
                type="date"
                name="expected_delivery_date"
                defaultValue={(order as { expected_delivery_date?: string | null }).expected_delivery_date ?? ""}
                className="mt-1 w-full border border-ink/20 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Internal note (staff only)
              <input name="internal_note" defaultValue={order.internal_note ?? ""} placeholder="Called twice, deliver after 6pm" className="mt-1 w-full border border-ink/20 px-3 py-2" />
            </label>
            <fieldset className="block text-sm">
              <span className="mb-1 block">Invoice the shopper sees</span>
              <label className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="radio"
                  name="invoice_source"
                  value="auto"
                  defaultChecked={(order as { invoice_source?: string }).invoice_source !== "upload"}
                  className="size-4 accent-[#1c1917]"
                />
                System PDF (auto-generated, always current)
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="radio"
                  name="invoice_source"
                  value="upload"
                  defaultChecked={(order as { invoice_source?: string }).invoice_source === "upload"}
                  className="size-4 accent-[#1c1917]"
                />
                Uploaded file {(order as { invoice_file_path?: string | null }).invoice_file_path ? "(on file)" : "(none uploaded yet)"}
              </label>
            </fieldset>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="attach_invoice" className="size-4 accent-[#1c1917]" />
              Attach invoice PDF to this update mail
            </label>
            <SaveButton className="w-full">
              Save — current: {String(order.status).replaceAll("_", " ")}
            </SaveButton>
          </AdminForm>
        </section>
      </div>

      <section className="mt-6 border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl">Invoice override</h2>
        <p className="mt-1 text-sm text-ink/60">
          Upload a PDF or image to replace the system invoice for this order. Uploading switches
          the invoice to your file immediately.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <a
            href={`/api/orders/${order.id}/invoice`}
            target="_blank"
            rel="noreferrer"
            className="border border-ink/20 px-4 py-2 transition hover:border-ink/50"
          >
            Preview current invoice
          </a>
          {(order as { invoice_file_path?: string | null }).invoice_file_path && (
            <AdminForm action={removeInvoice} success="Invoice override removed">
              <input type="hidden" name="id" value={order.id} />
              <ActionButton>Remove upload — back to system PDF</ActionButton>
            </AdminForm>
          )}
        </div>
        <AdminForm action={uploadInvoice} success="Invoice uploaded" className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <input type="hidden" name="id" value={order.id} />
          <input
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="max-w-full cursor-pointer border border-ink/20 bg-white px-3 py-2"
          />
          {/* ActionButton: file inputs don't trip AdminForm dirty-tracking reliably. */}
          <ActionButton>Upload invoice (PDF/image, max 5MB)</ActionButton>
        </AdminForm>
      </section>

      <section className="mt-6 border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl">Timeline</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(history ?? []).map((h: { id: string; from_status: string | null; to_status: string; created_at: string }) => (
            <li key={h.id} className="text-ink/70">
              {h.from_status ? `${h.from_status} → ` : ""}{h.to_status} · {new Date(h.created_at).toLocaleString("en-AE")}
            </li>
          ))}
          {(!history || history.length === 0) && <li className="text-ink/60">No updates yet.</li>}
        </ul>
      </section>
      </div>
    </>
  );
}
