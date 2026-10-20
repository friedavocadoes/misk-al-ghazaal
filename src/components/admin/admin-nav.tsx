"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
    label: "Content & discoverability",
    items: [
      { href: "/admin/blogs", label: "Blogs" },
      { href: "/admin/seo", label: "SEO for pages & products" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/lineups", label: "Lineups" },
      { href: "/admin/notes", label: "Notes" },
      { href: "/admin/rituals", label: "Rituals" },
      { href: "/admin/banners", label: "Banners + menu artwork" },
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
  {
    label: "Emails",
    items: [
      { href: "/admin/emails/hello", label: "Hello mail" },
      { href: "/admin/promo", label: "Promo mail" },
    ],
  },
];

export function AdminNav({ email, role }: { email: string; role: AdminRole }) {
  const [query,setQuery]=useState("");
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const groups =
    role === "super_admin"
      ? [
          {
            label: "Operations",
            items: [
              { href: "/admin", label: "Overview" },
              { href: "/admin/orders", label: "Orders" },
              { href: "/admin/bin", label: "Recycle bin" },
              { href: "/admin/logs", label: "Audit log" },
            ],
          },
          ...GROUPS,
        ]
      : role === "content_editor"
        ? GROUPS.filter((g) => g.label === "Content & discoverability")
        : [
            {
              label: "Operations",
              items: [
                { href: "/admin/orders", label: "Orders" },
                { href: "/admin/bin", label: "Recycle bin" },
                { href: "/admin/logs", label: "Audit log" },
              ],
            },
          ];
  return (
    <>
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 bg-cream/95 px-5 py-4 backdrop-blur">
        <button
          type="button"
          onClick={() => drawer.current?.showModal()}
          className="flex items-center gap-3 rounded-lg border border-ink/15 px-4 py-2 text-sm"
        >
          <Menu size={17} />
          Workspace
        </button>
        <Link
          href={role === "content_editor" ? "/admin/blogs" : "/admin"}
          className="hidden text-sm tracking-widest lg:block"
        >
          MISK AL GHAZAAL
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="hidden text-xs sm:block">
            View store ↗
          </Link>
          <span className="min-w-0 max-w-40 text-xs"><span className="block truncate" title={email}>{email}</span><span className="text-fog">{role.replaceAll("_"," ")}</span></span><SignOutButton />
        </div>
      </header>
      <dialog
        ref={drawer}
        className="fixed inset-y-0 start-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] border-e border-ink/10 bg-cream p-0 text-ink backdrop:bg-black/35"
        onClick={(e) => {
          if (e.target === drawer.current) {
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right)
              drawer.current?.close();
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-ink/10 p-5">
          <span className="text-lg">Workspace</span>
          <button
            aria-label="Close navigation"
            onClick={() => drawer.current?.close()}
            className="p-2"
          >
            <X size={19} />
          </button>
        </div>
        <div className="px-5 pt-5"><input aria-label="Search workspace" placeholder="Search workspace…" value={query} onChange={e=>setQuery(e.target.value)} className="w-full rounded-lg border border-ink/20 bg-white p-3 text-sm"/></div><nav className="space-y-7 p-5">
          {groups.map(g=>({...g,items:g.items.filter(i=>`${g.label} ${i.label}`.toLowerCase().includes(query.toLowerCase()))})).filter(g=>g.items.length).map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 text-[10px] uppercase tracking-widest text-fog">
                {g.label}
              </h2>
              {g.items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => drawer.current?.close()}
                  className={cn(
                    "my-1 block rounded-lg px-3 py-2.5 text-sm",
                    pathname === i.href ||
                      (pathname.startsWith(i.href + "/") && i.href !== "/admin")
                      ? "bg-ink text-white"
                      : "hover:bg-sand",
                  )}
                >
                  {i.label}
                </Link>
              ))}
            </section>
          ))}
        </nav>
        <p className="break-all border-t border-ink/10 p-5 text-xs text-fog">
          {email}
          <br />
          {role.replaceAll("_", " ")}
        </p>
      </dialog>
    </>
  );
}
