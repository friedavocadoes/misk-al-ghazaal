// Single connected scroll animation: the navbar morph and the hero
// expansion share ONE progress over the SAME scroll range with the SAME
// scrub smoothing, so both start at the first pixel and complete
// together — no thresholds, no timers, nothing to oscillate.
// Hero owns its scrub tween; SiteHeader slaves its geometry to the
// identical range via its own ScrollTrigger (deterministic same lag).
export const MORPH_RANGE = 150;
export const MORPH_SCRUB = 0.5;

/** Raw (unsmoothed) progress — for initial sync before ScrollTrigger ticks. */
export function morphProgress(y: number): number {
  return Math.min(1, Math.max(0, y / MORPH_RANGE));
}
