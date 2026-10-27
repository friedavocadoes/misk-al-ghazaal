import { paymentMethodLabel } from "@/lib/admin-orders-model";
import type { SupabaseClient } from "@supabase/supabase-js";
import { statusLabel } from "./order-status";
import { buildInvoicePdf } from "./invoice";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

/** Current invoice for an order as a mail attachment: the admin's
    uploaded file when set, else a freshly generated system PDF.
    Never throws — returns null so a PDF failure can't fail checkout. */
export async function resolveInvoiceAttachment(
  admin: SupabaseClient,
  orderId: string,
): Promise<MailAttachment | null> {
  try {
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
    if (!order) return null;
    const o = order as {
      order_no: string;
      payment_method: string;
      customer_name: string;
      phone: string;
      email: string | null;
      address: string;
      city: string;
      emirate: string;
      country_code: string | null;
      state_name: string | null;
      postcode: string | null;
      subtotal: number;
      discount: number;
      shipping: number;
      total: number;
      status: string;
      coupon_code: string | null;
      tracking_no: string | null;
      expected_delivery_date: string | null;
      created_at: string;
      invoice_source: string | null;
      invoice_file_path: string | null;
    };

    if (o.invoice_source === "upload" && o.invoice_file_path) {
      const { data: file, error } = await admin.storage
        .from("invoices")
        .download(o.invoice_file_path);
      if (!error && file) {
        const ext = o.invoice_file_path.split(".").pop()?.toLowerCase() ?? "pdf";
        const mime =
          ext === "pdf"
            ? "application/pdf"
            : ext === "png"
              ? "image/png"
              : ext === "webp"
                ? "image/webp"
                : "image/jpeg";
        const base = o.invoice_file_path.split("/").pop() || `Invoice-${o.order_no}.${ext}`;
        return { filename: base, content: Buffer.from(await file.arrayBuffer()), contentType: mime };
      }
    }

    const { data: itemRows } = await admin
      .from("order_items")
      .select("title, qty, unit_price")
      .eq("order_id", orderId);
    const lines = (
      (itemRows as { title: string; qty: number; unit_price: number }[] | null) ?? []
    ).map((l) => ({ title: l.title, qty: l.qty, unit: Number(l.unit_price) }));

    const pdf = await buildInvoicePdf({
      orderNo: o.order_no,
      paymentLabel: paymentMethodLabel(o.payment_method ?? "cod"),
      date: new Date().toLocaleDateString("en-AE", { day: "numeric", month: "long", year: "numeric" }),
      statusLabel: statusLabel(o.status),
      customerName: o.customer_name,
      phone: o.phone,
      email: o.email ?? "",
      addressHtml: `${o.address}<br />${[o.city, o.state_name, o.postcode, o.country_code].filter(Boolean).join(" · ")}`,
      lines,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      shipping: Number(o.shipping),
      total: Number(o.total),
      couponCode: o.coupon_code || undefined,
      trackingNo: o.tracking_no || undefined,
      expectedDeliveryDate: o.expected_delivery_date
        ? new Date(`${o.expected_delivery_date}T00:00:00`).toLocaleDateString("en-AE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : null,
    });
    return { filename: `Invoice-${o.order_no}.pdf`, content: pdf, contentType: "application/pdf" };
  } catch {
    return null;
  }
}
