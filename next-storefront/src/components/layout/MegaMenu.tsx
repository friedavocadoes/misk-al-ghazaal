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

// Converted from sections/Ishi_megamenu.liquid + snippets/megamenu.liquid.
// Items come from lib/site getMegaMenu() — pass `items`, never hardcode here.
export function MegaMenu({ items }: { items: MegaMenuItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav aria-label="Primary">
      <ul className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-0">
        {items.map((item) => (
          <li
            key={item.label}
            className="relative"
            onMouseEnter={() => setOpen(item.columns ? item.label : null)}
            onMouseLeave={() => setOpen(null)}
          >
            <Link
              href={item.href}
              onClick={() => setOpen(null)}
              className="flex items-center gap-1 px-3 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-espresso transition hover:text-gold lg:py-2"
            >
              {item.label}
              {item.badge && (
                <span
                  className={cn(
                    "px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white",
                    item.badge === "new" && "bg-ink",
                    item.badge === "sale" && "bg-[#9c2b2e]",
                    item.badge === "hot" && "bg-gold"
                  )}
                >
                  {item.badge}
                </span>
              )}
              {item.columns && (
                <ChevronDown className="size-3 text-fog" aria-hidden />
              )}
            </Link>
            {item.columns && open === item.label && (
              <div className="z-50 border border-ink/10 bg-white p-6 shadow-[0_24px_60px_-24px_rgba(28,25,23,0.35)] lg:absolute lg:left-1/2 lg:top-full lg:w-[560px] lg:-translate-x-1/2">
                <div className="grid gap-6 sm:grid-cols-3">
                  {item.columns.map((col) => (
                    <div key={col.heading}>
                      <Link
                        href={col.href}
                        className="font-display text-base italic text-ink hover:text-gold"
                      >
                        {col.heading}
                      </Link>
                      <span className="mt-2 block h-px w-8 bg-gold-soft" />
                      <ul className="mt-3 space-y-2">
                        {col.links.map((l) => (
                          <li key={l.href}>
                            <Link
                              href={l.href}
                              className="text-[13px] text-espresso transition hover:text-gold"
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
