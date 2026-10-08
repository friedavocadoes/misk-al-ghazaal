import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";

async function countRows(run: () => PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await run();
  return count ?? 0;
}

const CARDS: {
  group: string;
  links: { href: string; label: string; desc: string; icon?: string }[];
}[] = [
  {
    group: "Sell",
    links: [
      { href: "/admin/orders", label: "Orders", desc: "Confirm, track & support every parcel" },
    ],
  },
  {
    group: "Catalog",
    links: [
      { href: "/admin/products", label: "Products", desc: "Prices, copy, lineups, notes & artwork" },
      { href: "/admin/lineups", label: "Lineups", desc: "Named lines behind “More from the lineup”" },
      { href: "/admin/notes", label: "Notes", desc: "Fragrance-note library + brand colors" },
      { href: "/admin/rituals", label: "Rituals", desc: "Reusable how-to-use guides" },
      { href: "/admin/banners", label: "Banners", desc: "Hero slides & brand banners" },
    ],
  },
  {
    group: "Growth",
    links: [
      { href: "/admin/coupons", label: "Coupons", desc: "Codes, gifts & free-shipping promos" },
      { href: "/admin/referrals", label: "Referrals", desc: "Reward % + introductions" },
      { href: "/admin/reviews", label: "Reviews", desc: "Moderate what the majlis says" },
    ],
  },
];

export default async function AdminHome() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const supabase = await createClient();

  const [newOrders, products, pendingReviews, activeCoupons, referrals] = await Promise.all([
    countRows(() => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "new").is("deleted_at", null)),
    session.role === "super_admin" ? countRows(() => supabase.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null)) : 0,
    session.role === "super_admin" ? countRows(() => supabase.from("reviews").select("id", { count: "exact", head: true }).eq("approved", false)) : 0,
    session.role === "super_admin" ? countRows(() => supabase.from("coupons").select("id", { count: "exact", head: true }).eq("active", true).is("owner_id", null)) : 0,
    session.role === "super_admin" ? countRows(() => supabase.from("referrals").select("id", { count: "exact", head: true })) : 0,
  ]);

  const metrics = [
    { label: "New orders", value: newOrders, href: "/admin/orders?status=new" },
    ...(session.role === "super_admin"
      ? [
          { label: "Products", value: products, href: "/admin/products" },
          { label: "Reviews to moderate", value: pendingReviews, href: "/admin/reviews" },
          { label: "Active coupons", value: activeCoupons, href: "/admin/coupons" },
          { label: "Referrals", value: referrals, href: "/admin/referrals" },
        ]
      : []),
  ];

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="eyebrow">Maison Misk Al Ghazaal</p>
        <h1 className="mt-1 font-display text-4xl">At a glance</h1>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {metrics.map((m) => (
            <Link key={m.label} href={m.href} className="group border border-ink/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold/60">
              <p className="font-display text-4xl text-ink transition group-hover:text-gold">{m.value}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog">{m.label}</p>
            </Link>
          ))}
        </div>

        {session.role === "super_admin" &&
          CARDS.map((c) => (
            <section key={c.group} className="mt-10">
              <h2 className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-fog">
                {c.group}
                <span className="h-px flex-1 bg-ink/10" />
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {c.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group flex items-center gap-4 border border-ink/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_16px_32px_-20px_rgba(28,25,23,0.4)]"
                  >
                    <span>
                      <span className="block font-display text-xl text-ink transition group-hover:text-gold">
                        {l.label}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-fog">{l.desc}</span>
                    </span>
                    <span aria-hidden className="ms-auto text-gold opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}

      </div>
    </>
  );
}
