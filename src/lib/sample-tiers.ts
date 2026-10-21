export type SampleTier = { min_subtotal: number; allowance: number };
export function sampleAllowance(tiers: SampleTier[], subtotal: number) {
  const sorted = [...tiers].sort((a, b) => a.min_subtotal - b.min_subtotal);
  const count = Math.max(
    0,
    ...sorted.filter((t) => t.min_subtotal <= subtotal).map((t) => t.allowance),
  );
  const next = sorted.find(
    (t) => t.min_subtotal > subtotal && t.allowance > count,
  );
  return {
    count,
    next,
    remaining: next ? Math.max(0, next.min_subtotal - subtotal) : 0,
  };
}
export function readSamples(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem("misk-samples") || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
