import { createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/service";
import { publicIP } from "@/lib/analytics/ip-location";
export async function POST(req: Request) {
  if (
    req.headers.get("origin") !== new URL(req.url).origin ||
    req.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 2048)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const b = JSON.parse(raw);
    if (b.website) return Response.json({ ok: true });
    const email = String(b.email ?? "")
        .trim()
        .toLowerCase(),
      name = String(b.name ?? "").trim();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !name ||
      name.length > 150
    )
      throw Error("Enter your email and name.");
    const jar = await cookies();
    const stored = jar.get("misk-newsletter")?.value;
    const sender =
      stored && /^[a-f0-9-]{36}$/.test(stored) ? stored : randomUUID();
    const secret = process.env.COMMUNICATION_PREFERENCES_SECRET;
    if (!secret) throw Error("Newsletter is temporarily unavailable.");
    const visitorIP =
      process.env.VERCEL === "1"
        ? publicIP(
            req.headers.get("x-vercel-forwarded-for") ??
              req.headers.get("x-forwarded-for"),
          )
        : process.env.ANALYTICS_TRUST_PROXY === "cloudflare"
          ? publicIP(req.headers.get("cf-connecting-ip"))
          : process.env.ANALYTICS_TRUST_PROXY === "custom"
            ? publicIP(req.headers.get("x-real-ip"))
            : null;
    const key = createHmac("sha256", secret)
      .update(visitorIP ?? sender)
      .digest("hex");
    const { error } = await createAdminClient().rpc("newsletter_signup", {
      p_sender: key,
      p_email: email,
      p_name: name,
    });
    if (error)
      throw Error(
        error.message.includes("Please wait")
          ? "Please wait before subscribing again."
          : "Newsletter is temporarily unavailable.",
      );
    jar.set("misk-newsletter", sender, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400 * 30,
    });
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Please try again." },
      { status: 400 },
    );
  }
}
