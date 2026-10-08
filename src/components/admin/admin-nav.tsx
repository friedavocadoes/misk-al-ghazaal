"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/admin-auth";
import { SignOutButton } from "./sign-out-button";

const LINKS: { href: string; label: string; superOnly?: boolean }[] = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products", superOnly: true },
  { href: "/admin/coupons", label: "Coupons", superOnly: true },
  { href: "/admin/lineups", label: "Lineups", superOnly: true },
  { href: "/admin/notes", label: "Notes", superOnly: true },
  { href: "/admin/rituals", label: "Rituals", superOnly: true },
  { href: "/admin/reviews", label: "Reviews", superOnly: true },
  { href: "/admin/referrals", label: "Referrals", superOnly: true },
  { href: "/admin/banners", label: "Banners", superOnly: true },
  { href: "/admin/bin", label: "Recycle bin" },
];

export function AdminNav({ email, role }: { email: string; role: AdminRole }) {
  const pathname = usePathname();
  const items = LINKS.filter((l) => !l.superOnly || role === "super_admin");
  return (
    <div className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 overflow-x-auto px-6 py-3">
        <Link href="/admin/orders" className="mr-2 shrink-0">
          <span className="block font-display text-lg leading-none tracking-[0.08em]">
            MISK AL GHAZAAL
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.22em] text-ink/50">
            Admin · {role === "super_admin" ? "Super admin" : "Orders"}
          </span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {items.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "admin-navlink whitespace-nowrap px-3 py-2 text-sm",
                  active
                    ? "bg-ink text-white"
                    : "text-ink/60 hover:bg-ink/5 hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <span className="hidden shrink-0 text-xs text-ink/50 md:block">{email}</span>
        <span className="shrink-0">
          <SignOutButton />
        </span>
      </div>
    </div>
  );
}
