"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pencil, X } from "lucide-react";

/** Staff-only edit bar pinned to the top of the storefront content:
    resolves the current page to its admin editor (product editor for
    PDPs, SEO editor for everything else). Shoppers never see it —
    the layout only renders it with a staff session, and the resolver
    API 401s without one. */
export function AdminEditBar() {
  const pathname = usePathname();
  const [target, setTarget] = useState<{ href: string; label: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let live = true;
    setTarget(null);
    setDismissed(false);
    fetch(`/api/admin/edit-target?path=${encodeURIComponent(pathname)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { href?: string; label?: string } | null) => {
        if (live && j?.href && j?.label) setTarget({ href: j.href, label: j.label });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pathname]);

  if (dismissed || !target) return null;
  return (
    <div className="flex items-center gap-3 border-b border-gold/50 bg-ink px-5 py-2 text-white">
      <Pencil className="size-3.5 shrink-0 text-gold-soft" />
      <span className="min-w-0 flex-1 truncate text-[11px] uppercase tracking-[0.18em] text-white/70">
        Editing · {target.label}
      </span>
      <Link
        href={target.href}
        className="shrink-0 bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#755c26]"
      >
        Open in admin
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss edit bar"
        className="shrink-0 cursor-pointer p-1 text-white/60 transition hover:text-white"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
