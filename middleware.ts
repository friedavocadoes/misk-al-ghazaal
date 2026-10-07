import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Admin + API are locale-free (EN only) — never prefix with /en or /ar.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.next();
  }
  return intlMiddleware(req);
}

export const config = {
  // Skip Next internals, static files and API routes.
  // NOTE: /admin is matched here but passed through above (no locale prefix).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
