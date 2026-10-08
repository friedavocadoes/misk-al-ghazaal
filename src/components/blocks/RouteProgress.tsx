"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

/** Instant tap feedback for navigation: any internal link press raises a
    gold sweep at the viewport top; it drops the moment the new route lands
    (or after a safety timeout). Kills dead-tap spam-clicking. */
export function RouteProgress() {
  const pathname = usePathname();
  const [target, setTarget] = useState<string | null>(null);
  const busy = target !== null && target !== pathname;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(el instanceof HTMLAnchorElement)) return;
      const href = el.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      if (el.target && el.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      setTarget(href);
      setTimeout(() => setTarget(null), 8000);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!busy) return null;
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[90] h-[2px] overflow-hidden">
      <span className="route-progress-bar block h-full w-1/3 bg-gold" />
    </div>
  );
}
