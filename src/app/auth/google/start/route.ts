import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { GOOGLE_ATTEMPT_PREFIX, safeAuthNext } from "@/lib/google-redirect";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (req.headers.get("origin") !== url.origin || req.headers.get("sec-fetch-site") === "cross-site") {
    return new NextResponse(null, { status: 403 });
  }
  if (Number(req.headers.get("content-length")) > 4096) return new NextResponse(null, { status: 413 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return new NextResponse(null, { status: 400 });
  const locale = body.locale === "ar" ? "ar" : "en";
  const nonce = randomBytes(32).toString("hex");
  const state = randomBytes(16).toString("hex");
  const next = safeAuthNext(body.next, locale === "ar" ? "/ar/account" : "/account");
  const ref = typeof body.ref === "string" ? body.ref.trim().slice(0, 100) : undefined;
  const response = NextResponse.json({
    nonce: createHash("sha256").update(nonce).digest("hex"), state,
  }, { headers: { "Cache-Control": "private, no-store" } });
  response.cookies.set(GOOGLE_ATTEMPT_PREFIX + state, JSON.stringify({
    nonce, next, ref, locale, expires: Date.now() + 600000,
  }), { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 600 });
  return response;
}
