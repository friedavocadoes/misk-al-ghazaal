import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { updateSession } from "./src/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Admin + API are locale-free (EN only) — never prefix with /en or /ar.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
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
