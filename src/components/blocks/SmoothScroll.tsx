"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/** GSAP ScrollSmoother for the storefront (per latest GSAP docs: native
    scroll drives it, the `#smooth-content` div lags behind on a
    `matrix3d()` transform — real scrollbar, touch and a11y intact).
    Config: `smooth: 1` catch-up, whisper of smoothing on touch
    (`smoothTouch: 0.1`), no data-speed effects, no normalizeScroll (the
    Leaflet map keeps its own gestures). No pins or spacers anywhere —
    sticky elements hold themselves via `useStickyLock` (paint-only).
    Architecture rules (GSAP caveats):
    - The sticky header rides INSIDE the content (first child) so in-flow
      geometry matches the pre-smoother page exactly — nothing starts
      behind the navbar, morph included.
    - `position: fixed` must otherwise live OUTSIDE the wrapper — the shop
      dropdown only opens at rest (scroll closes it), the mobile menu /
      gallery zoom / avatar modal portal to document.body, and
      RouteProgress stays outside.
    - Skipped entirely under prefers-reduced-motion; admin has no smoother. */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // StrictMode-safe: never stack two instances.
    ScrollSmoother.get()?.kill();
    const smoother = ScrollSmoother.create({ smooth: 1, smoothTouch: 0.1 });

    // In-page anchors (#reviews, #detailed-notes) ride the smoother
    // instead of jumping. Capture phase preempts Next's hash nav.
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!(el instanceof HTMLAnchorElement)) return;
      const hash = el.getAttribute("href");
      if (!hash || hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      smoother.scrollTo(target, true);
    };
    document.addEventListener("click", onClick, true);

    // Content height shifts (images, accordions, infinite grids, header
    // morph) — keep the internal ScrollTrigger honest. Trailing 150ms so a
    // morph transition doesn't storm refreshes mid-flight; the refresh
    // lands just after it settles.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    const content = document.getElementById("smooth-content");
    if (content) ro.observe(content);

    return () => {
      document.removeEventListener("click", onClick, true);
      if (timer) clearTimeout(timer);
      ro.disconnect();
      smoother.kill();
    };
  }, []);

  // Route changes: park at top instantly (Next would jump natively and
  // the content would visibly rewind), then re-measure for the new page.
  // Same-pathname facet pushes (?sort=…) don't touch scroll.
  useEffect(() => {
    const smoother = ScrollSmoother.get();
    if (!smoother) return;
    smoother.scrollTop(0);
    const t1 = requestAnimationFrame(() => ScrollTrigger.refresh());
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
