import { after, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/service";
import { contactMessage } from "@/lib/contact-message";
import { sendMailboxMail } from "@/lib/mailer";
import { SITE } from "@/lib/site";
export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin)
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  try {
    if (Number(req.headers.get("content-length")) > 16000)
      throw new Error("Message too large.");
    const raw = await req.text();
    if (raw.length > 12000) throw new Error("Message too large.");
    const body = JSON.parse(raw);
    if (body.website) throw new Error("Unable to send this message.");
    const data = contactMessage(body);
    const jar = await cookies();
    const candidate = jar.get("misk-contact-sender")?.value;
    const sender =
      candidate && /^[0-9a-f-]{36}$/.test(candidate) ? candidate : randomUUID();
    const { data: reference, error } = await createAdminClient().rpc(
      "submit_contact_message",
      { p_sender: sender, p_data: data },
    );
    if (error) {
      if (error.message.includes("Please wait"))
        return NextResponse.json(
          { error: error.message },
          { status: 429, headers },
        );
      return NextResponse.json(
        {
          error:
            "We couldn’t receive your message. Please try our direct contact options.",
        },
        { status: 503, headers },
      );
    }
    jar.set("misk-contact-sender", sender, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400,
    });
    after(async () => {
      try {
        const h = (v: unknown) =>
          String(v ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
        await sendMailboxMail("hello", {
          to: SITE.email,
          subject: `Enquiry ${reference} · ${data.topic}`,
          title: `New ${data.topic} enquiry`,
          preheader: `${reference} · ${data.name}`,
          bodyHtml: `<p>Reference <strong>${h(reference)}</strong></p><p>${h(data.name)} · ${h(data.email)} · ${h(data.phone)}</p><p style="white-space:pre-wrap">${h(data.message)}</p><p><a href="${new URL(req.url).origin}/admin/inbox">Open the admin inbox for all details</a></p>`,
        });
      } catch {
        /* The inbox copy is durable even if SMTP is unavailable. */
      }
    });
    return NextResponse.json({ reference }, { headers });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Check your message and try again.",
      },
      { status: 400, headers },
    );
  }
}
