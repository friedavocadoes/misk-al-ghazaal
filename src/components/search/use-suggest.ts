"use client";

import { useEffect, useRef, useState } from "react";
import type { SuggestItem } from "@/app/api/search/suggest/route";

const DEBOUNCE_MS = 180;
const CACHE_TTL_MS = 60_000;
// Live rows per batch, repeat queries served instantly: Postgres is the
// index (renames/additions/deletes reflect immediately), this cache only
// skips the network for identical keystrokes within a minute.
const cache = new Map<string, { at: number; items: SuggestItem[] }>();

export function useSuggest(query: string, scope: "store" | "admin" = "store") {
  const trimmed = query.trim();
  const short = trimmed.length < 2;
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = trimmed;
    if (q.length < 2) return;
    const t = setTimeout(() => {
      const key = `${scope}:${q.toLowerCase()}`;
      const hit = cache.get(key);
      // State changes happen inside async continuations (network +
      // timer callbacks), never synchronously in the effect body.
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        setItems(hit.items);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(false);
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      const sp = new URLSearchParams({ q, limit: "8" });
      if (scope === "admin") sp.set("scope", "admin");
      fetch(`/api/search/suggest?${sp}`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error("suggest");
          return r.json() as Promise<{ items?: SuggestItem[] }>;
        })
        .then((j) => {
          const next = j.items ?? [];
          cache.set(key, { at: Date.now(), items: next });
          // Cap memory: keep the freshest 60 queries.
          if (cache.size > 60) cache.delete(cache.keys().next().value as string);
          setItems(next);
        })
        .catch((e: Error) => {
          if (e.name !== "AbortError") setError(true);
        })
        .finally(() => {
          if (abort.current === ctrl) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      abort.current?.abort();
    };
  }, [trimmed, scope]);

  // Short queries always read empty — no stale rows linger, no reset effect.
  if (short) return { items: [] as SuggestItem[], loading: false, error: false };
  return { items, loading, error };
}

const MAX_RECENTS = 6;

export function getRecents(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function pushRecent(key: string, q: string) {
  const clean = q.trim();
  if (clean.length < 2) return;
  try {
    localStorage.setItem(key, JSON.stringify([clean, ...getRecents(key).filter((s) => s !== clean)].slice(0, MAX_RECENTS)));
  } catch {
    /* private mode — recents just don't persist */
  }
}
