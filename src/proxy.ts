import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// Next 16 convention: `proxy.ts` next to `app/` (a root-level file is
// silently ignored when using src/ — that dead middleware.ts is why
// locale redirects + session refresh never fired).
export default async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // OAuth rescue: Supabase falls back to the Site URL when the callback URL
  // isn't allowlisted, landing here as /?code=… — forward it (invisibly) to
  // the real exchange handler instead of dropping the session.
  if (searchParams.has("code") && pathname !== "/auth/callback") {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.rewrite(url);
  }

  // Admin, auth callback + API are locale-free (EN only) — never prefix.
  // (Missing /auth here is what 404'd Google logins: the code landed on
  // /en/auth/callback, which doesn't exist.)
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
  ) {
    return updateSession(req);
  }
  const intlRes = intlMiddleware(req);
  // Merge refreshed Supabase cookies onto the response we return.
  const supabaseRes = await updateSession(req);
  for (const c of supabaseRes.cookies.getAll()) intlRes.cookies.set(c);
  return intlRes;
}

export const config = {
  // Skip Next internals, static files and API routes.
  // NOTE: /admin is matched here but passed through above (no locale prefix).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
