import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { bootstrapShopper } from "@/lib/auth-bootstrap";
import { GOOGLE_ATTEMPT_PREFIX, safeAuthNext } from "@/lib/google-redirect";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const jar = await cookies();
  let locale = "en";
  let next = "/account";
  let ref: string | undefined;
  let attemptName: string | undefined;
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url.origin), 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    if (attemptName) response.cookies.set(attemptName, "", {
      httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 0,
    });
    return response;
  };
  try {
    if (Number(req.headers.get("content-length")) > 20000) return new NextResponse(null, { status: 413 });
    const body = await req.formData();
    const csrf = body.get("g_csrf_token");
    if (typeof csrf !== "string" || !csrf || csrf !== req.cookies.get("g_csrf_token")?.value) {
      return new NextResponse(null, { status: 403 });
    }
    const state = body.get("state");
    if (typeof state !== "string" || !/^[a-f0-9]{32}$/.test(state)) return new NextResponse(null, { status: 400 });
    attemptName = GOOGLE_ATTEMPT_PREFIX + state;
    const attempt = JSON.parse(jar.get(attemptName)?.value ?? "null");
    if (!attempt || typeof attempt.nonce !== "string" || !/^[a-f0-9]{64}$/.test(attempt.nonce) || !(attempt.expires > Date.now())) throw new Error("expired");
    locale = attempt.locale === "ar" ? "ar" : "en";
    next = safeAuthNext(attempt.next, locale === "ar" ? "/ar/account" : "/account");
    ref = typeof attempt.ref === "string" ? attempt.ref : undefined;
    const credential = body.get("credential");
    if (typeof credential !== "string" || credential.length > 16000) throw new Error("credential");
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google", token: credential, nonce: attempt.nonce,
    });
    if (error || !data.user) throw new Error("authentication");
    await bootstrapShopper(data.user, url.origin, ref);
    return redirect(next);
  } catch {
    const path = locale === "ar" ? "/ar/account/login" : "/account/login";
    return redirect(path + "?error=google&next=" + encodeURIComponent(next) + (ref ? "&ref=" + encodeURIComponent(ref) : ""));
  }
}
