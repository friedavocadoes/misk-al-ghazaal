"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/admin-auth";
import { LiveAnalytics } from "./analytics/LiveAnalytics";
import {
  AdminAttentionProvider,
  AdminNotificationMenu,
  AttentionBadge,
  useAdminAttention,
} from "./notifications";
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
    label: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Overview & conversion" },
      { href: "/admin/analytics/traffic", label: "Traffic & bot detection" },
      { href: "/admin/analytics/locations", label: "Locations & emirates" },
      { href: "/admin/analytics/products", label: "Product interest" },
      { href: "/admin/analytics/acquisition", label: "Sources & campaigns" },
      { href: "/admin/analytics/feedback", label: "Why no buy?" },
      { href: "/admin/analytics/customers", label: "Customer data & export" },
    ],
  },
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
      { href: "/admin/stores", label: "Stores & product availability" },
      { href: "/admin/samples", label: "Samples & spending tiers" },
      { href: "/admin/lineups", label: "Lineups" },
      { href: "/admin/notes", label: "Notes" },
      { href: "/admin/rituals", label: "Rituals" },
      { href: "/admin/banners", label: "Banners + menu artwork" },
    ],
  },
  {
    label: "Access",
    items: [{ href: "/admin/users", label: "Customers & staff" }],
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

export function AdminNav(props: { email: string; role: AdminRole }) {
  return (
    <AdminAttentionProvider key={`${props.email}:${props.role}`} enabled={props.role !== "content_editor"}>
      <AdminNavContent {...props} />
    </AdminAttentionProvider>
  );
}
function AdminNavContent({ email, role }: { email: string; role: AdminRole }) {
  const { feed } = useAdminAttention();
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const openSearch = useCallback(() => {
    if (!drawer.current?.open) drawer.current?.showModal();
    search.current?.focus();
    search.current?.select();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k" &&
        !event.altKey
      ) {
        event.preventDefault();
        openSearch();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch]);
  const groups =
    role === "super_admin"
      ? [
          {
            label: "Operations",
            items: [
              { href: "/admin", label: "Overview" },
              { href: "/admin/orders", label: "Orders" },
              { href: "/admin/inbox", label: "Contact inbox" },
              { href: "/admin/bin", label: "Recycle bin" },
              { href: "/admin/logs", label: "Audit log" },
            ],
          },
          ...GROUPS,
        ]
      : role === "content_editor"
        ? GROUPS.filter(
            (g) =>
              g.label === "Content & discoverability" ||
              g.label === "Analytics",
          ).map((g) => ({
            ...g,
            items: g.items.filter(
              (i) => i.href !== "/admin/analytics/customers",
            ),
          }))
        : [
            {
              label: "Operations",
              items: [
                { href: "/admin/orders", label: "Orders" },
                { href: "/admin/inbox", label: "Contact inbox" },
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
          aria-haspopup="dialog"
          aria-controls="admin-workspace-dialog"
          onClick={openSearch}
          className="flex items-center gap-3 rounded-lg border border-ink/15 px-4 py-2 text-sm"
        >
          <Menu size={17} />
          Workspace
          <AttentionBadge count={feed.counts.total} />
          <kbd className="hidden rounded border border-ink/15 px-1.5 text-[10px] text-fog sm:inline">
            Ctrl / ⌘ K
          </kbd>
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
          <span className="min-w-0 max-w-40 text-xs">
            <span className="block truncate" title={email}>
              {email}
            </span>
            <span className="text-fog">{role.replaceAll("_", " ")}</span>
          </span>
          {role !== "content_editor" && <AdminNotificationMenu />}
          <SignOutButton />
        </div>
      </header>
      {(role === "super_admin" || role === "content_editor") && (
        <LiveAnalytics />
      )}
      <dialog
        ref={drawer}
        id="admin-workspace-dialog"
        aria-label="Workspace navigation"
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
        <div className="px-5 pt-5">
          <input
            ref={search}
            aria-label="Search workspace"
            placeholder="Search workspace…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-ink/20 bg-white p-3 text-sm"
          />
        </div>
        <nav className="space-y-7 p-5">
          {groups
            .map((g) => ({
              ...g,
              items: g.items.filter((i) =>
                `${g.label} ${i.label} ${i.href}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              ),
            }))
            .filter((g) => g.items.length)
            .map((g) => (
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
                      "my-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      pathname === i.href ||
                        (pathname.startsWith(i.href + "/") &&
                          i.href !== "/admin")
                        ? "bg-ink text-white"
                        : "hover:bg-sand",
                    )}
                  >
                    <span className="flex-1">{i.label}</span>
                    <AttentionBadge
                      count={
                        i.href === "/admin/orders"
                          ? feed.counts.order
                          : i.href === "/admin/inbox"
                            ? feed.counts.contact
                            : i.href === "/admin/reviews"
                              ? feed.counts.review
                              : 0
                      }
                    />
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
