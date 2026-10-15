import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { getAdminSession } from "@/lib/admin-auth";
import { statusLabel } from "@/lib/order-status";
import { buildInvoicePdf } from "@/lib/invoice";

const UPLOAD_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Invoice file: uploaded override when the admin set one, else the
    system PDF generated live (totals/status/ETA always current).
    Shoppers see ONLY their own orders; staff see all. */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const staff = await getAdminSession().catch(() => null);
  if (!user && !staff) return NextResponse.json({ error: "login" }, { status: 401 });

  const admin = await createAdminClient();
  let orderQuery = admin.from("orders").select("*").eq("id", id);
  if (!staff && user) orderQuery = orderQuery.eq("user_id", user.id);
  const { data: order } = await orderQuery.single();
  if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const o = order as {
    order_no: string;
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

  // Admin-uploaded override wins when present.
  if (o.invoice_source === "upload" && o.invoice_file_path) {
    const { data: file, error } = await admin.storage
      .from("invoices")
      .download(o.invoice_file_path);
    if (!error && file) {
      const ext = o.invoice_file_path.split(".").pop()?.toLowerCase() ?? "pdf";
      const buf = Buffer.from(await file.arrayBuffer());
      const base = o.invoice_file_path.split("/").pop() || `Invoice-${o.order_no}.${ext}`;
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          "Content-Type": UPLOAD_MIME[ext] ?? "application/octet-stream",
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${base}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    // Missing file (deleted from storage) — fall through to system PDF.
  }

  const { data: itemRows } = await admin
    .from("order_items")
    .select("title, qty, unit_price")
    .eq("order_id", id);
  const lines = (
    (itemRows as { title: string; qty: number; unit_price: number }[] | null) ?? []
  ).map((l) => ({ title: l.title, qty: l.qty, unit: Number(l.unit_price) }));

  const pdf = await buildInvoicePdf({
    orderNo: o.order_no,
    date: new Date(o.created_at).toLocaleDateString("en-AE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
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

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Invoice-${o.order_no}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
