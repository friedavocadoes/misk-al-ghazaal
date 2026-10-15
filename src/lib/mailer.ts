import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Domain mailboxes (cPanel, one SMTP login per address).
//   hello   → welcome mail on account creation
//   noreply → order confirmations + status updates (never reply-monitored)
//   promo   → newsletters / offers (promo_opt_in shoppers only)
//   orders  → shopper order-issue forms, forwarded to SUPPORT_EMAIL
//   support → human inbox, mailto-only (no SMTP — see SUPPORT_EMAIL)
// Graceful no-op when a mailbox is unconfigured, so dev/staging never crash.
// Every mailbox reads its own *_SMTP_* env block and falls back to the
// legacy SMTP_* block, so existing single-sender setups keep working.
// ---------------------------------------------------------------------------

export type Mailbox = "hello" | "noreply" | "promo" | "orders";

const MAILBOX_PREFIX: Record<Mailbox, string> = {
  hello: "HELLO",
  noreply: "NOREPLY",
  promo: "PROMO",
  orders: "ORDERS",
};

export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? "support@miskalghazaalperfumes.com";

export function mailboxAddress(m: Mailbox): string {
  const p = MAILBOX_PREFIX[m];
  return (
    process.env[`${p}_SMTP_FROM`] ??
    process.env[`${p}_SMTP_USER`] ??
    process.env.SMTP_FROM ??
    process.env.SMTP_USER ??
    `${m}@miskalghazaalperfumes.com`
  );
}

function mailboxTransporter(m: Mailbox): Transporter | null {
  const p = MAILBOX_PREFIX[m];
  const host =
    process.env[`${p}_SMTP_HOST`] ?? process.env.SMTP_HOST ?? null;
  const user =
    process.env[`${p}_SMTP_USER`] ?? process.env.SMTP_USER ?? null;
  const pass =
    process.env[`${p}_SMTP_PASS`] ?? process.env.SMTP_PASS ?? null;
  if (!host || !user || !pass) return null;
  const portRaw =
    process.env[`${p}_SMTP_PORT`] ?? process.env.SMTP_PORT ?? "465";
  const port = Number(portRaw) || 465;
  const secureRaw =
    process.env[`${p}_SMTP_SECURE`] ?? process.env.SMTP_SECURE;
  const secure = secureRaw !== undefined ? secureRaw === "1" : port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
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
<p style="margin-top:28px;font-size:12px;color:#78716c">Misk Al Ghazaal Perfumes · Mamzar Centre, Dubai · Cash on delivery across the UAE.<br />Need help? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#8a6d2f">${SUPPORT_EMAIL}</a></p>
</div></body></html>`;
  return { html, text };
}

export async function sendMailboxMail(
  mailbox: Mailbox,
  opts: {
    to: string;
    subject: string;
    title: string;
    preheader: string;
    bodyHtml: string;
    replyTo?: string;
  },
): Promise<{ sent: boolean }> {
  const tp = mailboxTransporter(mailbox);
  if (!tp || !opts.to.includes("@")) return { sent: false };
  try {
    const { html, text } = shell(opts.title, opts.preheader, opts.bodyHtml);
    await tp.sendMail({
      from: `"Misk Al Ghazaal" <${mailboxAddress(mailbox)}>`,
      to: opts.to,
      subject: opts.subject,
      text,
      html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    return { sent: true };
  } catch (e) {
    console.error(`[mailer:${mailbox}]`, e instanceof Error ? e.message : e);
    return { sent: false };
  }
}

/** Legacy single-sender entry — now routes via noreply (order mail). */
export async function sendMail(opts: {
  to: string;
  subject: string;
  title: string;
  preheader: string;
  bodyHtml: string;
}): Promise<{ sent: boolean }> {
  return sendMailboxMail("noreply", opts);
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
<p>Start with the icons: best sellers, new arrivals. Every order leaves with complimentary samples.</p>`,
  };
}

/** Elegant hello mail with best-seller cards. Products carry
    { title, price, image, href } resolved by the caller (admin-picked
    slugs, falling back to live best sellers). Subject lives in the admin
    settings — this returns title/preheader/body only. */
export function buildHelloEmail(opts: {
  name: string;
  heading: string;
  bodyHtml: string;
  products: { title: string; price: number; image?: string; href: string }[];
  origin: string;
}): { title: string; preheader: string; bodyHtml: string } {
  const cards = opts.products
    .map(
      (p) => `<td style="padding:0 6px;vertical-align:top" width="33%">
<a href="${opts.origin}${p.href}" style="text-decoration:none;color:#1c1917">
${p.image ? `<img src="${p.image.startsWith("http") ? p.image : `${opts.origin}${p.image}`}" width="150" style="width:100%;height:180px;object-fit:cover;display:block" alt="" />` : ""}
<p style="font-family:Georgia,serif;font-size:15px;margin:10px 0 2px">${p.title}</p>
<p style="font-size:13px;color:#8a6d2f;margin:0">AED ${p.price.toFixed(2)} — shop →</p>
</a></td>`,
    )
    .join("");
  return {
    title: opts.heading.replace("{name}", opts.name || "friend"),
    preheader: "Your account is ready — here is where to begin.",
    bodyHtml: `<div style="text-align:center;padding:8px 0 4px;font-size:42px;line-height:1">✦</div>
${opts.bodyHtml}
${cards ? `<h3 style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#8a6d2f;margin-top:24px">Begin with the icons</h3><table style="width:100%;border-collapse:collapse"><tr>${cards}</tr></table>` : ""}
<p style="margin-top:24px">Every order leaves with complimentary samples — cash on delivery across the UAE.</p>`,
  };
}

/** Order-issue forwarding (orders@ → support@): shopper request + order context. */
export function buildOrderIssueEmail(opts: {
  orderNo: string;
  type: string;
  typeLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  detailsHtml: string;
}): { subject: string; title: string; preheader: string; bodyHtml: string } {
  return {
    subject: `Order ${opts.orderNo} — ${opts.typeLabel} · via website`,
    title: `Order ${opts.orderNo} — ${opts.typeLabel.toLowerCase()}.`,
    preheader: `${opts.orderNo} · ${opts.type} · ${opts.customerName}`,
    bodyHtml: `<p><strong>Type:</strong> ${opts.typeLabel}</p>
<p><strong>Order:</strong> ${opts.orderNo}</p>
<p><strong>Customer:</strong> ${opts.customerName} · ${opts.customerEmail} · ${opts.customerPhone}</p>
<div style="border-top:1px solid #e9e1d2;margin-top:16px;padding-top:16px">${opts.detailsHtml}</div>`,
  };
}
