import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Transactional mail over the owner's own SMTP (free — no service cost).
// Graceful no-op when SMTP_* env is missing, so dev/staging never crash.
// Configure in Supabase? No — this is app-side: any SMTP host works
// (Gmail app password, domain mail, Resend SMTP). See SETUP_SUPABASE.md.
// ---------------------------------------------------------------------------

function transporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "1",
    auth: { user, pass },
  });
}

function shell(
  title: string,
  preheader: string,
  body: string,
): { html: string; text: string } {
  const text = `${title}\n${preheader}\n\n${body.replace(/<[^>]*>/g, "")}`;
  const html = `<!doctype html><html><body style="margin:0;background:#faf7f1;font-family:Georgia,serif;color:#1c1917">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d2f;margin:0">Misk Al Ghazaal</p>
<h1 style="font-size:28px;font-weight:400;margin:12px 0 4px">${title}</h1>
<p style="font-size:13px;color:#78716c;margin:0 0 20px">${preheader}</p>
<div style="border-top:1px solid #e9e1d2;padding-top:20px;font-size:15px;line-height:1.7">${body}</div>
<p style="margin-top:28px;font-size:12px;color:#78716c">Misk Al Ghazaal Perfumes · Mamzar Centre, Dubai · Cash on delivery across the UAE.</p>
</div></body></html>`;
  return { html, text };
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  title: string;
  preheader: string;
  bodyHtml: string;
}): Promise<{ sent: boolean }> {
  const tp = transporter();
  if (!tp || !opts.to.includes("@")) return { sent: false };
  try {
    const { html, text } = shell(opts.title, opts.preheader, opts.bodyHtml);
    await tp.sendMail({
      from: `"Misk Al Ghazaal" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
      to: opts.to,
      subject: opts.subject,
      text,
      html,
    });
    return { sent: true };
  } catch (e) {
    console.error("[mailer]", e instanceof Error ? e.message : e);
    return { sent: false };
  }
}

export function orderLinesHtml(
  lines: { title: string; qty: number; unit: number }[],
  subtotal: number,
  discount: number,
  shipping: number,
  total: number,
): string {
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e9e1d2">${l.title} × ${l.qty}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e9e1d2">AED ${(l.unit * l.qty).toFixed(2)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse">${rows}</table>
<p>Subtotal AED ${subtotal.toFixed(2)}${discount > 0 ? ` · Discount −AED ${discount.toFixed(2)}` : ""} · Shipping ${shipping === 0 ? "complimentary" : `AED ${shipping.toFixed(2)}`}</p>
<p style="font-size:20px">Total AED ${total.toFixed(2)} — cash on delivery.</p>`;
}

/** Full order-page email: header, items, totals, delivery + pin, tracking,
    factory contact — mirrors what the shopper sees in /account/orders. */
export function buildOrderEmail(opts: {
  orderNo: string;
  date: string;
  statusLabel: string;
  customerName: string;
  lines: {
    title: string;
    qty: number;
    unit: number;
    image?: string;
    href?: string;
  }[];
  origin: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  addressHtml: string;
  pinUrl?: string;
  trackingNo?: string;
  trackingUrl?: string;
  couponCode?: string;
}): { subject: string; title: string; preheader: string; bodyHtml: string } {
  const o = opts;
  const itemRows = o.lines
    .map((l) => {
      const img = l.image
        ? `<img src="${l.image.startsWith("http") ? l.image : `${o.origin}${l.image}`}" width="56" style="width:56px;height:70px;object-fit:cover;display:block" alt="" />`
        : "";
      const title = l.href
        ? `<a href="${o.origin}${l.href}" style="color:#1c1917">${l.title}</a>`
        : l.title;
      return `<tr>
<td style="padding:10px 0;border-bottom:1px solid #e9e1d2;vertical-align:top">${img}</td>
<td style="padding:10px 0 10px 12px;border-bottom:1px solid #e9e1d2;vertical-align:top">${title}<br /><span style="color:#78716c">× ${l.qty}</span></td>
<td align="right" style="padding:10px 0;border-bottom:1px solid #e9e1d2;vertical-align:top">AED ${(l.unit * l.qty).toFixed(2)}</td>
</tr>`;
    })
    .join("");
  const tracking = o.trackingNo
    ? `<p>Tracking: <strong>${o.trackingNo}</strong>${o.trackingUrl ? ` — <a href="${o.trackingUrl}">track your parcel</a>` : ""}</p>`
    : "";
  return {
    subject: `Order ${o.orderNo} — ${o.statusLabel} · Misk Al Ghazaal`,
    title:
      o.statusLabel === "received"
        ? "Shukran — order received."
        : `Order ${o.statusLabel.toLowerCase()}.`,
    preheader: `${o.orderNo} · ${o.date} · cash on delivery`,
    bodyHtml: `<p>Dear ${o.customerName},</p>
<p>Your order <strong>${o.orderNo}</strong> (${o.date}) is now <strong>${o.statusLabel}</strong>.</p>
<table style="width:100%;border-collapse:collapse">${itemRows}</table>
<p>Subtotal AED ${o.subtotal.toFixed(2)}${o.discount > 0 ? ` · Discount −AED ${o.discount.toFixed(2)}` : ""} · Shipping ${o.shipping === 0 ? "complimentary" : `AED ${o.shipping.toFixed(2)}`}${o.couponCode ? ` · Code ${o.couponCode}` : ""}</p>
<p style="font-size:20px">Total AED ${o.total.toFixed(2)} — cash on delivery.</p>
<h3 style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8a6d2f">Delivery</h3>
<p>${o.addressHtml}</p>
${o.pinUrl ? `<p><a href="${o.pinUrl}">View delivery pin</a></p>` : ""}
${tracking}
<h3 style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8a6d2f">Need a hand?</h3>
<p>Reply to this email or WhatsApp the factory — quote order ${o.orderNo}.</p>`,
  };
}

export function buildWelcomeEmail(name: string): {
  subject: string;
  title: string;
  preheader: string;
  bodyHtml: string;
} {
  return {
    subject: "Welcome to the Maison — Misk Al Ghazaal",
    title: `Ahlan wa sahlan${name ? `, ${name}` : ""}.`,
    preheader: "Your account is ready — invite friends, earn together.",
    bodyHtml: `<p>Your maison account is ready. From here you can track every parcel, keep a wishlist, hold reward coupons — and invite friends: you both earn on their first order.</p>
<p>Start with the icons: best sellers, new arrivals, holy oudh. Every order leaves with complimentary samples.</p>`,
  };
}
