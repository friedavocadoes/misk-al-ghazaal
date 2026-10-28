export type AttentionKind = "order" | "contact" | "review";
export interface AttentionItem {
  kind: AttentionKind;
  id: string;
  created_at: string;
  title: string;
  detail: string;
  href: string;
}
export interface AttentionFeed {
  counts: Record<AttentionKind | "total", number>;
  items: AttentionItem[];
}
export const EMPTY_ATTENTION: AttentionFeed = {
  counts: { order: 0, contact: 0, review: 0, total: 0 },
  items: [],
};
export function attentionKind(value: unknown): value is AttentionKind {
  return value === "order" || value === "contact" || value === "review";
}
export function badgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export const ADMIN_ATTENTION_EVENT = "admin-attention-changed";
export function notifyAdminAttentionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_ATTENTION_EVENT));
  try {
    localStorage.setItem(ADMIN_ATTENTION_EVENT, String(Date.now()));
  } catch {
    /* Other tabs refresh on their next poll. */
  }
}
