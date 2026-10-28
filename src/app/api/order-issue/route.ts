import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildOrderIssueEmail, sendMailboxMail, SUPPORT_EMAIL } from "@/lib/mailer";

const TYPE_LABELS: Record<string, string> = {
  change_address: "Change address",
  change_date: "Change delivery date",
  cancel: "Cancel order",
  refund_status: "Refund status",
  other: "Other request",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      type?: string;
      fields?: Record<string, string>;
    };
    const orderId = String(body.orderId ?? "");
    const type = String(body.type ?? "");
    if (!orderId || !TYPE_LABELS[type])
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "login" }, { status: 401 });

    // Strict ownership: claimed orders carry user_id (see
    // claimGuestOrders) — no typed-email matching, ever.
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_no, customer_name, phone, email, status, address, city")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();
    if (!order) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const o = order as {
      order_no: string;
      customer_name: string;
      phone: string;
      email: string | null;
      status: string;
      address: string;
      city: string;
    };

    const f = body.fields ?? {};
    const clean = (k: string) => String(f[k] ?? "").trim().slice(0, 2000);
    let details = "";
    if (type === "change_address") {
      const addr = clean("address");
      if (!addr) return NextResponse.json({ error: "New address is required." }, { status: 400 });
      details = `<p><strong>New address:</strong> ${esc(addr)}</p>
<p><strong>City:</strong> ${esc(clean("city"))} · <strong>Region:</strong> ${esc(clean("state"))} · <strong>Pincode:</strong> ${esc(clean("postcode"))}</p>
<p><strong>Phone:</strong> ${esc(clean("phone") || o.phone)}</p>
${clean("note") ? `<p><strong>Note:</strong> ${esc(clean("note"))}</p>` : ""}
<p><strong>Current on file:</strong> ${esc(o.address)} · ${esc(o.city)}</p>`;
    } else if (type === "change_date") {
      if (!clean("date")) return NextResponse.json({ error: "Preferred date is required." }, { status: 400 });
      details = `<p><strong>Preferred delivery date:</strong> ${esc(clean("date"))}</p>
<p><strong>Reason unavailable:</strong> ${esc(clean("note")) || "—"}</p>`;
    } else if (type === "cancel") {
      if (!clean("reason")) return NextResponse.json({ error: "Reason is required." }, { status: 400 });
      details = `<p><strong>Cancel reason:</strong> ${esc(clean("reason"))}</p>
${clean("note") ? `<p><strong>Details:</strong> ${esc(clean("note"))}</p>` : ""}
<p>Order status on file: <strong>${esc(o.status)}</strong></p>`;
    } else if (type === "refund_status") {
      details = `<p>Shopper asks for the refund status of this ${esc(o.status)} order.</p>
${clean("note") ? `<p><strong>Details:</strong> ${esc(clean("note"))}</p>` : ""}`;
    } else {
      if (!clean("subject") || !clean("description"))
        return NextResponse.json({ error: "Subject and description are required." }, { status: 400 });
      details = `<p><strong>Subject:</strong> ${esc(clean("subject"))}</p>
<p>${esc(clean("description")).replace(/\n/g, "<br />")}</p>`;
    }

    const shopperEmail = o.email || user.email || "";
    const mail = buildOrderIssueEmail({
      orderNo: o.order_no,
      type,
      typeLabel: TYPE_LABELS[type],
      customerName: o.customer_name,
      customerEmail: shopperEmail,
      customerPhone: o.phone,
      detailsHtml: details,
    });
    const result = await sendMailboxMail("orders", {
      to: SUPPORT_EMAIL,
      subject: mail.subject,
      title: mail.title,
      preheader: mail.preheader,
      bodyHtml: mail.bodyHtml,
      ...(shopperEmail.includes("@") ? { replyTo: shopperEmail } : {}),
    });
    if (!result.sent)
      return NextResponse.json({ error: result.disabled ? "Email requests are paused. Please contact us by WhatsApp instead." : "Mail server not configured — WhatsApp us instead." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
