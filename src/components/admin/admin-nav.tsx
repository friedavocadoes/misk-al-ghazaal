"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/admin-auth";
import { SignOutButton } from "./sign-out-button";

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/lineups", label: "Lineups" },
      { href: "/admin/notes", label: "Notes" },
      { href: "/admin/rituals", label: "Rituals" },
      { href: "/admin/banners", label: "Banners" },
    ],
  },
  {
    label: "Access",
    items: [{ href: "/admin/users", label: "Users" }],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/referrals", label: "Referrals" },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/countries", label: "Countries" },
      { href: "/admin/homepage", label: "Homepage" },
    ],
  },
];

export function AdminNav({ email, role }: { email: string; role: AdminRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const close = () => setOpen(null);
  const superOnly = role === "super_admin";
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkCls = (isActive: boolean) =>
    cn(
      "whitespace-nowrap px-3 py-2 text-sm transition",
      isActive ? "bg-ink text-white" : "text-ink/60 hover:bg-ink/5 hover:text-ink",
    );

  return (
    <div className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3">
        <Link href="/admin" className="mr-2 shrink-0">
          <span className="block font-display text-lg leading-none tracking-[0.08em]">
            MISK AL GHAZAAL
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.22em] text-ink/50">
            Admin · {role === "super_admin" ? "Super admin" : "Orders"}
          </span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          <Link href="/admin/orders" aria-current={active("/admin/orders") ? "page" : undefined} className={linkCls(active("/admin/orders"))}>
            Orders
          </Link>
          {superOnly &&
            GROUPS.map((g) => {
              const groupActive = g.items.some((i) => active(i.href));
              return (
                <div
                  key={g.label}
                  className="relative"
                  onMouseEnter={() => setOpen(g.label)}
                  onMouseLeave={() => setOpen(null)}
                >
                  <button
                    type="button"
                    onClick={() => setOpen((o) => (o === g.label ? null : g.label))}
                    aria-expanded={open === g.label}
                    className={cn(linkCls(groupActive), "flex items-center gap-1")}
                  >
                    {g.label}
                    <ChevronDown className={cn("size-3.5 transition-transform", open === g.label && "rotate-180")} />
                  </button>
                  <div
                    className={cn(
                      "absolute left-0 top-full z-50 min-w-44 border border-ink/10 bg-white py-1 shadow-[0_24px_48px_-20px_rgba(28,25,23,0.4)] transition-all duration-200",
                      open === g.label ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
                    )}
                  >
                    {g.items.map((i) => (
                      <Link
                        key={i.href}
                        href={i.href}
                        onClick={close}
                        aria-current={active(i.href) ? "page" : undefined}
                        className={cn(
                          "block px-4 py-2 text-sm transition hover:bg-sand",
                          active(i.href) ? "text-gold" : "text-espresso",
                        )}
                      >
                        {i.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          <Link href="/admin/bin" aria-current={active("/admin/bin") ? "page" : undefined} className={linkCls(active("/admin/bin"))}>
            Bin
          </Link>
        </nav>
        <span className="hidden shrink-0 text-xs text-ink/50 md:block">{email}</span>
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs text-ink/50 underline-offset-4 transition hover:text-ink hover:underline"
        >
          View store
        </Link>
        <span className="shrink-0">
          <SignOutButton />
        </span>
      </div>
    </div>
  );
}
