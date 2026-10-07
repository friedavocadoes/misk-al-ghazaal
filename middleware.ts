import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, static files and API routes.
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
