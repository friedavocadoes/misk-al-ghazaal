import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "node:crypto";
import { addressKey, normalizeAddress, type SavedAddress } from "@/lib/saved-address";

/** Logged-in shopper's autofill snapshot: stored profile contact +
    last order (fallback when the profile was never filled). Never cached —
    it decides whose details prefill checkout. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });

  const [{ data: profile }, { data: lastOrder }, { data: addressRows }] = await Promise.all([
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
    supabase.from("shopper_addresses")
      .select("id,address")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const savedAddresses: SavedAddress[] = [];
  for (const row of addressRows ?? []) {
    const address = normalizeAddress(row.address);
    if (address) savedAddresses.push({ id: row.id, address });
  }
  if (!savedAddresses.length) {
    const legacy = normalizeAddress(profile?.default_address) ??
      normalizeAddress(lastOrder && {
        line: lastOrder.address, city: lastOrder.city,
        state: lastOrder.state_name || lastOrder.emirate,
        country_code: lastOrder.country_code, postcode: lastOrder.postcode,
        label: lastOrder.address_label, lat: lastOrder.delivery_lat, lng: lastOrder.delivery_lng,
      });
    if (legacy) savedAddresses.push({ id: "previous", address: legacy });
  }

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  return NextResponse.json(
    {
      userId: user.id,
      name:
        (profile as { full_name?: string | null } | null)?.full_name ||
        meta.full_name ||
        meta.name ||
        lastOrder?.customer_name ||
        "",
      email: user.email ?? "",
      phone:
        (profile as { phone?: string | null } | null)?.phone ||
        (lastOrder as { phone?: string } | null)?.phone ||
        "",
      defaultAddress:
        (profile as { default_address?: unknown } | null)?.default_address ?? null,
      lastOrder: lastOrder ?? null,
      savedAddresses,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const address = normalizeAddress(body?.address);
  if (!address || typeof body?.id !== "string" ||
      (body.id !== "previous" && !/^[\da-f-]{36}$/i.test(body.id))) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }
  const { data: zone } = await supabase.from("delivery_countries")
    .select("code").eq("code", address.countryCode).eq("active", true).maybeSingle();
  if (!zone) return NextResponse.json({ error: "Delivery is unavailable for this address." }, { status: 400 });

  const address_key = createHash("sha256").update(addressKey(address)).digest("hex");
  const patch = { address, address_key };
  const query = body.id === "previous"
    ? supabase.from("shopper_addresses").upsert(
        { ...patch, user_id: user.id, last_used_at: new Date().toISOString() },
        { onConflict: "user_id,address_key" },
      )
    : supabase.from("shopper_addresses").update(patch).eq("id", body.id).eq("user_id", user.id);
  const { data, error } = await query.select("id,address").single();
  if (error || !data) return NextResponse.json({ error: "Couldn’t save this address." }, { status: 409 });
  return NextResponse.json(data);
}
