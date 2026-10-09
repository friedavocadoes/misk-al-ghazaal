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

function shell(title: string, preheader: string, body: string): { html: string; text: string } {
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
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e9e1d2">${l.title} × ${l.qty}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e9e1d2">Dhs ${(l.unit * l.qty).toFixed(2)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse">${rows}</table>
<p>Subtotal Dhs ${subtotal.toFixed(2)}${discount > 0 ? ` · Discount −Dhs ${discount.toFixed(2)}` : ""} · Shipping ${shipping === 0 ? "complimentary" : `Dhs ${shipping.toFixed(2)}`}</p>
<p style="font-size:20px">Total Dhs ${total.toFixed(2)} — cash on delivery.</p>`;
}
