"use client";

import confetti from "canvas-confetti";

const MAISON = ["#8a6d2f", "#b3924a", "#1c1917", "#faf7f1", "#9c2b2e"];

/** Little maison celebration: gold/ink confetti, short + light.
    Skips entirely under reduced-motion (and SSR). */
export function celebrate(from?: HTMLElement | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const origin = (() => {
      if (!from) return { x: 0.5, y: 0.4 };
      const r = from.getBoundingClientRect();
      return {
        x: (r.left + r.width / 2) / window.innerWidth,
        y: (r.top + r.height / 2) / window.innerHeight,
      };
    })();
    confetti({
      particleCount: 70,
      spread: 65,
      startVelocity: 32,
      ticks: 140,
      gravity: 1.05,
      scalar: 0.9,
      colors: MAISON,
      origin,
      disableForReducedMotion: true,
    });
  } catch {
    /* confetti must never break checkout */
  }
}
