import path from "path";
import PDFDocument from "pdfkit";
import ArabicReshaper from "arabic-reshaper";
import { SUPPORT_EMAIL } from "./mailer";

// ---------------------------------------------------------------------------
// System invoice PDF (pdfkit, Node runtime). Latin runs use Helvetica;
// any line containing Arabic falls back to embedded Amiri (OFL,
// public/fonts) with shaped + visually-ordered Arabic runs, so Arabic
// customer names/addresses join correctly instead of rendering blank.
// ---------------------------------------------------------------------------

export interface InvoiceLine {
  title: string;
  qty: number;
  unit: number;
}

export interface InvoiceData {
  orderNo: string;
  date: string;
  statusLabel: string;
  customerName: string;
  phone: string;
  email: string;
  addressHtml: string; // "<br />"-separated lines
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
  trackingNo?: string;
  paymentLabel?: string;
  expectedDeliveryDate?: string | null;
}

const AR_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** Shape + visual-order one Arabic run for an LTR canvas. */
function visualArabic(run: string): string {
  return ArabicReshaper.convertArabic(run).split("").reverse().join("");
}

/** Split a line into Latin/Arabic runs; Arabic runs become visual-order. */
function visualLine(line: string): { text: string; arabic: boolean } {
  return { text: splitVisual(line), arabic: AR_RE.test(line) };
}

function splitVisual(line: string): string {
  const out: string[] = [];
  let buf = "";
  let inAr: boolean | null = null;
  for (const ch of line) {
    const isAr = AR_RE.test(ch);
    if (inAr === null) inAr = isAr;
    if (isAr !== inAr) {
      out.push(inAr ? visualArabic(buf) : buf);
      buf = "";
      inAr = isAr;
    }
    buf += ch;
  }
  if (buf) out.push(inAr ? visualArabic(buf) : buf);
  return out.join("");
}

const INK = "#1c1917";
const GOLD = "#8a6d2f";
const MUTED = "#78716c";
const HAIR = "#e9e1d2";
const GREEN = "#00b949";

interface Fonts {
  latin: string;
  arabic: string;
}

function loadFonts(doc: InstanceType<typeof PDFDocument>): Fonts {
  const dir = path.join(process.cwd(), "public", "fonts");
  try {
    doc.registerFont("amiri", path.join(dir, "Amiri-Regular.ttf"));
    doc.registerFont("amiri-bold", path.join(dir, "Amiri-Bold.ttf"));
    return { latin: "Helvetica", arabic: "amiri" };
  } catch {
    // Font files missing (shouldn't happen — committed) — Latin only.
    return { latin: "Helvetica", arabic: "Helvetica" };
  }
}

interface LineOpts {
  size?: number;
  bold?: boolean;
  color?: string;
  width?: number;
  align?: "left" | "right" | "center";
}

/** Draw one mixed-script line, switching to Amiri when Arabic is present. */
function drawLine(
  doc: InstanceType<typeof PDFDocument>,
  f: Fonts,
  text: string,
  x: number,
  y: number,
  opts: LineOpts,
): number {
  const v = visualLine(text);
  const font = v.arabic
    ? opts.bold
      ? "amiri-bold"
      : f.arabic
    : opts.bold
      ? "Helvetica-Bold"
      : f.latin;
  doc
    .font(font)
    .fontSize(opts.size ?? 10)
    .fillColor(opts.color ?? INK)
    .text(v.text, x, y, { width: opts.width, align: opts.align ?? "left" });
  return doc.y;
}

export function buildInvoicePdf(d: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 48 });
      const f = loadFonts(doc);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const W = doc.page.width - 96;
      let y = 48;

      // Crest: the maison logo, centered. Falls back to the text
      // eyebrow when the file is ever missing (WebP originals can't
      // embed in PDFs — logo-invoice.png is the converted copy).
      try {
        const LW = 84;
        doc.image(
          path.join(process.cwd(), "public", "logo-invoice.png"),
          (doc.page.width - LW) / 2,
          y,
          {
            width: LW,
          },
        );
        y += LW + 12;
      } catch {
        y = drawLine(doc, f, "MISK AL GHAZAAL", 48, y, {
          size: 11,
          bold: true,
          color: GOLD,
          width: W,
          align: "center",
        });
      }
      y = drawLine(doc, f, "INVOICE", 48, y, {
        size: 26,
        bold: false,
        color: INK,
        width: W,
        align: "center",
      });
      y = drawLine(
        doc,
        f,
        `${d.orderNo}  ·  ${d.date}  ·  ${d.statusLabel}`,
        48,
        y + 4,
        { size: 10, color: MUTED, width: W, align: "center" },
      );

      // Bill-to
      y += 14;
      y = drawLine(doc, f, "BILL TO", 48, y, {
        size: 9,
        bold: true,
        color: GOLD,
        width: W,
      });
      const addrLines = d.addressHtml
        .split(/<br\s*\/?>/i)
        .map((s) => s.replace(/<[^>]*>/g, "").trim())
        .filter(Boolean);
      y = drawLine(doc, f, d.customerName, 48, y + 4, {
        size: 12,
        bold: true,
        width: 360,
      });
      if (d.phone)
        y = drawLine(doc, f, d.phone, 48, y + 1, {
          size: 10,
          color: MUTED,
          width: 360,
        });
      if (d.email)
        y = drawLine(doc, f, d.email, 48, y + 1, {
          size: 10,
          color: MUTED,
          width: 360,
        });
      for (const a of addrLines)
        y = drawLine(doc, f, a, 48, y + 1, { size: 10, width: 360 });

      // Items table
      y += 16;
      const cols = { item: 48, qty: 340, unit: 400, amount: 470 };
      y = drawLine(doc, f, "ITEM", cols.item, y, {
        size: 9,
        bold: true,
        color: GOLD,
        width: 280,
      });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(GOLD);
      doc.text("QTY", cols.qty, y - 11, { width: 50, align: "right" });
      doc.text("UNIT", cols.unit, y - 11, { width: 60, align: "right" });
      doc.text("AMOUNT", cols.amount, y - 11, { width: 77, align: "right" });
      y += 6;
      doc
        .moveTo(48, y)
        .lineTo(48 + W, y)
        .strokeColor(HAIR)
        .lineWidth(1)
        .stroke();
      y += 8;

      doc.font("Helvetica").fontSize(10).fillColor(INK);
      for (const l of d.lines) {
        const title =
          l.title.length > 52 ? `${l.title.slice(0, 51)}…` : l.title;
        const rowTop = y;
        doc.text(title, cols.item, rowTop, { width: 280 });
        const h = Math.max(doc.y - rowTop, 16);
        doc.text(String(l.qty), cols.qty, rowTop, {
          width: 50,
          align: "right",
        });
        doc.text(`AED ${l.unit.toFixed(2)}`, cols.unit, rowTop, {
          width: 60,
          align: "right",
        });
        doc.text(`AED ${(l.unit * l.qty).toFixed(2)}`, cols.amount, rowTop, {
          width: 77,
          align: "right",
        });
        y = rowTop + h + 4;
        // Reserve room for totals + meta + footer: break early so the
        // money block never straddles two pages.
        if (y > 640) {
          doc.addPage();
          y = 48;
        }
      }
      doc
        .moveTo(48, y)
        .lineTo(48 + W, y)
        .strokeColor(HAIR)
        .lineWidth(1)
        .stroke();
      y += 10;

      // Totals must start with room to finish: totals (~110) + meta
      // (~24) + footer gap fit below 620; otherwise continue on a fresh
      // page so nothing ever straddles or collides with the footer.
      if (y > 620) {
        doc.addPage();
        y = 48;
      }

      // Totals (right aligned block)
      const trow = (
        label: string,
        value: string,
        bold = false,
        big = false,
        green = false,
      ) => {
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(big ? 14 : 10)
          .fillColor(bold ? INK : MUTED);
        doc.text(label, 300, y, { width: 150, align: "right" });
        doc
          .fillColor(green ? GREEN : INK)
          .text(value, 455, y, { width: 92, align: "right" });
        y = doc.y + (big ? 8 : 4);
      };
      trow("Subtotal", `AED ${d.subtotal.toFixed(2)}`);
      if (d.discount > 0)
        trow(
          "Discount" + (d.couponCode ? ` (${d.couponCode})` : ""),
          `AED -${d.discount.toFixed(2)}`,
          false,
          false,
          true,
        );
      trow(
        "Shipping",
        d.shipping === 0 ? "Complimentary" : `AED ${d.shipping.toFixed(2)}`,
      );
      trow(
        `TOTAL — ${d.paymentLabel ?? "cash on delivery"}`,
        `AED ${d.total.toFixed(2)}`,
        true,
        true,
      );

      // Meta
      y += 8;
      if (d.trackingNo)
        y = drawLine(doc, f, `Tracking: ${d.trackingNo}`, 48, y, {
          size: 10,
          width: W,
        });
      if (d.expectedDeliveryDate)
        y = drawLine(
          doc,
          f,
          `Expected delivery: ${d.expectedDeliveryDate}`,
          48,
          y + 2,
          { size: 10, width: W },
        );

      // Footer — anchored low for elegance, but clamped so both lines
      // always fit the current page (a fixed 770+ pin spilled the last
      // line onto page two on short invoices).
      const foot = Math.min(Math.max(y + 28, 700), 756);
      doc
        .moveTo(48, foot)
        .lineTo(48 + W, foot)
        .strokeColor(HAIR)
        .lineWidth(1)
        .stroke();
      drawLine(
        doc,
        f,
        "Misk Al Ghazaal Perfumes · Mamzar Centre, Dubai · Delivering across the UAE, Kuwait, Oman & Qattar.",
        48,
        foot + 8,
        {
          size: 9,
          color: MUTED,
          width: W,
          align: "center",
        },
      );
      drawLine(doc, f, `Questions? Write to ${SUPPORT_EMAIL}`, 48, foot + 22, {
        size: 9,
        color: MUTED,
        width: W,
        align: "center",
      });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
