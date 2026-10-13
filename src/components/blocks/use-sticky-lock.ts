"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Sticky replica for smoothed pages. CSS `position: sticky` dies inside
 * ScrollSmoother's fixed, overflow-hidden viewport wrapper (nothing in
 * there scrolls for sticky to react to), and pin spacers move layout — so
 * sticky elements hold themselves with a paint-only transform instead.
 *
 * Each frame the element's on-screen rect is clamped exactly like sticky:
 * hold at `top` while the page scrolls beneath, release when its bottom
 * meets the parent's bottom. Only `transform` is ever written, so this
 * cannot displace layout — worst case it rests at its natural spot.
 * Self-correcting across native scroll, smoother lag, snap animations,
 * resizes and route restores; inert under reduced-motion and far
 * offscreen (native sticky takes over when the smoother is off).
 */
export function useStickyLock(
  ref: RefObject<HTMLElement | null>,
  getTop: () => number,
) {
  // NOTE: getTop must only read live values (viewport size, DOM) — never
  // render state — because the loop below intentionally never re-subscribes
  // (restarting it would drop the held lock every render).
  const topRef = useRef(getTop);

  useEffect(() => {
    let raf = 0;
    let lock = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        if (el.style.transform) el.style.transform = "";
        lock = 0;
        return;
      }
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < -400 || rect.top > vh + 400) return;
      const top = topRef.current();
      // Exact sticky release: never hold past parent bottom minus self.
      const parent = el.parentElement;
      const cap = parent ? Math.max(0, parent.offsetHeight - el.offsetHeight) : Infinity;
      if (rect.top < top) lock = Math.min(lock + (top - rect.top), cap);
      else if (lock > 0) lock = Math.max(0, lock - (rect.top - top));
      const next = lock > 0 ? `translate3d(0, ${lock}px, 0)` : "";
      if (el.style.transform !== next) el.style.transform = next;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
}
