"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MegaMenuColumn {
  heading: string;
  href: string;
  links: { label: string; href: string }[];
}

export interface MegaMenuItem {
  label: string;
  href: string;
  badge?: "new" | "sale" | "hot";
  columns?: MegaMenuColumn[];
}

// Converted from sections/Ishi_megamenu.liquid + snippets/megamenu.liquid:
// top-level text_blocks with up to 3 nested linklists (navbar/navbar1/navbar2)
// become data-driven columns; badges map blog_show_new/sale/hot.
const MENU: MegaMenuItem[] = [
  {
    label: "Shop",
    href: "/collections",
    columns: [
      {
        heading: "Fragrances",
        href: "/collection/arabic-fragrance",
        links: [
          { label: "Arabic Fragrance", href: "/collection/arabic-fragrance" },
          { label: "Fresh Fragrance", href: "/collection/fresh-fragrance" },
          { label: "Best Sellers", href: "/collection/best-sellers" },
        ],
      },
      {
        heading: "Rituals",
        href: "/collection/dukhoon",
        links: [
          { label: "Dukhoon / Bakhoor", href: "/collection/dukhoon" },
          { label: "Mubakhar", href: "/collection/mubakhar" },
          { label: "Holy Oudh", href: "/collection/holy-oudh" },
        ],
      },
      {
        heading: "Edits",
        href: "/collection/new-arrivals",
        links: [
          { label: "New Arrivals", href: "/collection/new-arrivals" },
          { label: "Misk Al Ghazaal", href: "/collection/misk-al-ghazaal" },
          {
            label: "Ramadan Sale",
            href: "/collection/ramadan-bakhoor-sale",
          },
        ],
      },
    ],
  },
  { label: "Misk Al Ghazaal", href: "/collection/misk-al-ghazaal", badge: "hot" },
  { label: "Dukhoon", href: "/collection/dukhoon" },
  { label: "Holy Oudh", href: "/collection/holy-oudh" },
  { label: "New Arrivals", href: "/collection/new-arrivals", badge: "new" },
  { label: "Ramadan Offer", href: "/collection/ramadan-bakhoor-sale", badge: "sale" },
  { label: "Blog", href: "/blog" },
];

function Badge({ kind }: { kind: NonNullable<MegaMenuItem["badge"]> }) {
  return (
    <span
      className={cn(
        "ml-1 rounded px-1 py-px text-[9px] font-bold uppercase text-white",
        kind === "new" && "bg-emerald-600",
        kind === "sale" && "bg-red-600",
        kind === "hot" && "bg-amber-500"
      )}
    >
      {kind}
    </span>
  );
}

export function MegaMenu({ items = MENU }: { items?: MegaMenuItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav aria-label="Primary">
      <ul className="flex items-center gap-1">
        {items.map((item) => (
          <li
            key={item.label}
            className="relative"
            onMouseEnter={() => setOpen(item.columns ? item.label : null)}
            onMouseLeave={() => setOpen(null)}
          >
            <Link
              href={item.href}
              className="flex items-center rounded-full px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-emerald-900"
            >
              {item.label}
              {item.badge && <Badge kind={item.badge} />}
              {item.columns && (
                <ChevronDown className="ml-0.5 size-3.5 text-stone-400" />
              )}
            </Link>
            {item.columns && open === item.label && (
              <div className="absolute left-0 top-full z-50 w-[540px] rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
                <div className="grid grid-cols-3 gap-6">
                  {item.columns.map((col) => (
                    <div key={col.heading}>
                      <Link
                        href={col.href}
                        className="text-sm font-bold text-stone-900 hover:text-emerald-900"
                      >
                        {col.heading}
                      </Link>
                      <ul className="mt-2 space-y-1.5">
                        {col.links.map((l) => (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              className="text-sm text-stone-600 hover:text-emerald-900"
                            >
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { MENU as MEGA_MENU };
