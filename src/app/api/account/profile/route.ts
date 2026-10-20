import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Logged-in shopper's autofill snapshot: stored profile contact +
    last order (fallback when the profile was never filled). Never cached —
    it decides whose details prefill checkout. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });

  const [{ data: profile }, { data: lastOrder }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, default_address")
      .eq("id", user.id)
      .single(),
    supabase
      .from("orders")
      .select("customer_name, phone, email, address, city, emirate, country_code, state_name, postcode, address_label, delivery_lat, delivery_lng")
      .is("deleted_at", null)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  return NextResponse.json(
    {
      name:
        (profile as { full_name?: string | null } | null)?.full_name ||
        meta.full_name ||
        meta.name ||
        "",
      email: user.email ?? "",
      phone:
        (profile as { phone?: string | null } | null)?.phone ||
        (lastOrder as { phone?: string } | null)?.phone ||
        "",
      defaultAddress:
        (profile as { default_address?: unknown } | null)?.default_address ?? null,
      lastOrder: lastOrder ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
