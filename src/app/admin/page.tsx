import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { SignOutButton } from "@/components/admin/sign-out-button";

const NAV: { href: string; label: string; superOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products", superOnly: true },
  { href: "/admin/banners", label: "Banners", superOnly: true },
];

export default async function AdminHome() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const items = NAV.filter((n) => !n.superOnly || session.role === "super_admin");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-ink/10 pb-6">
        <div>
          <p className="eyebrow">Misk Al Ghazaal · Admin</p>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-ink/60">
            {session.email} · role: {session.role}
          </p>
        </div>
        <SignOutButton />
      </header>

      <nav className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="border border-ink/10 bg-white p-6 transition hover:border-ink/30"
          >
            <span className="font-display text-xl">{n.label}</span>
            <span className="mt-1 block text-sm text-ink/60">
              {n.href === "/admin" && "Revenue, orders by status, low stock."}
              {n.href === "/admin/orders" && "Monitor orders, update status, print slips."}
              {n.href === "/admin/products" && "Edit products, variants, stock, images."}
              {n.href === "/admin/banners" && "Edit hero + brand banners."}
            </span>
          </Link>
        ))}
      </nav>

      {session.role === "orders" && (
        <p className="mt-8 border border-ink/10 bg-white p-4 text-sm text-ink/70">
          You have orders-only access. Product, banner and content editing is
          restricted to super admins.
        </p>
      )}
    </div>
  );
}
