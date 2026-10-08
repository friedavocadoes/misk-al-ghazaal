import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublishableKey, getSupabaseUrl } from "./keys";

/** Refresh the Supabase session on every request so server components see
    a valid user (standard @supabase/ssr pattern). Returns a response
    carrying any refreshed cookies — callers merge them onto their own. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = getSupabaseUrl();
  const key = getPublishableKey();
  if (!url || !key) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });
  await supabase.auth.getUser();
  return supabaseResponse;
}
