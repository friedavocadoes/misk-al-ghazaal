"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartItem } from "./types";
import { createClient as createBrowserClient } from "./supabase/client";

const KEY = "misk-cart-v1";

export type CartLine = CartItem;

interface CartCtx {
  lines: CartLine[];
  count: number;
  add: (line: CartLine) => void;
  remove: (slug: string, variantId?: string) => void;
  setQty: (slug: string, variantId: string | undefined, qty: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

function same(a: CartLine, slug: string, variantId?: string): boolean {
  return a.productSlug === slug && (a.variantId ?? undefined) === (variantId ?? undefined);
}

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as CartLine[];
    return arr.filter((l) => l.productSlug && l.qty > 0).slice(0, 50);
  } catch {
    return [];
  }
}

function validLines(arr: unknown): CartLine[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (l): l is CartLine =>
        !!l && typeof (l as CartLine).productSlug === "string" && Number.isInteger((l as CartLine).qty),
    )
    .map((l) => ({
      productSlug: l.productSlug,
      ...(l.variantId ? { variantId: String(l.variantId) } : {}),
      qty: Math.min(20, Math.max(1, l.qty)),
    }))
    .slice(0, 50);
}

/** Both snapshots may describe the same items. Reconciliation must be idempotent. */
function mergeLines(a: CartLine[], b: CartLine[]): CartLine[] {
  const out: CartLine[] = [...a];
  for (const l of b) {
    const i = out.findIndex((x) => same(x, l.productSlug, l.variantId));
    if (i >= 0) out[i] = { ...out[i], qty: Math.min(20, Math.max(out[i].qty, l.qty)) };
    else if (out.length < 50) out.push(l);
  }
  return out;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // [] on the very first render (matches SSR — no hydration mismatch);
  // localStorage hydrates in a microtask below (setState in async
  // callbacks is fine; only synchronous effect bodies are banned).
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [readyUser, setReadyUser] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => {
      if (!live) return;
      setLines(load());
      setHydrated(true);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage full/blocked — cart still works in memory */
    }
  }, [lines, hydrated]);

  // Auth bootstrap must not overwrite a newer login/logout event.
  useEffect(() => {
    let live = true;
    let changed = false;
    const sb = createBrowserClient();
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (live) setUserId(session?.user?.id ?? null);
    });
    sb.auth.getUser().then(({ data }) => {
      if (live && !changed) setUserId(data.user?.id ?? null);
    }).catch(() => { if (live && !changed) setUserId(null); });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  const prevUser = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || userId === undefined) return;
    let live = true;
    const previous = prevUser.current;
    prevUser.current = userId;
    void (async () => {
      setReadyUser(null);
      if (!userId) {
        if (previous) {
          setLines([]);
          try { localStorage.removeItem("misk-coupon");localStorage.removeItem("misk-samples"); } catch { /* blocked storage */ }
        }
        return;
      }
      const switching = !!previous && previous !== userId;
      if (switching) setLines([]);
      try {
        const sb = createBrowserClient();
        const { data, error } = await sb.from("profiles").select("cart").eq("id", userId).single();
        if (!live || error) return;
        const server = validLines((data as { cart?: unknown } | null)?.cart);
        setLines(prev => mergeLines(switching ? [] : prev, server));
        // Only a completed successful pull enables profile writes.
        setReadyUser(userId);
      } catch {
        /* Keep local shopping available; never overwrite an unread server cart. */
      }
    })();
    return () => { live = false; };
  }, [hydrated, userId]);

  // Push (debounced): every settled change lands on the profile, so any
  // device logged into the same account shows the same bag.
  useEffect(() => {
    if (!hydrated || !userId || readyUser !== userId) return;
    const id = setTimeout(() => {
      createBrowserClient()
        .from("profiles")
        .update({ cart: lines })
        .eq("id", userId)
        .then(
          () => {},
          () => {},
        );
    }, 1000);
    return () => clearTimeout(id);
  }, [lines, hydrated, userId, readyUser]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => same(l, line.productSlug, line.variantId));
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: Math.min(20, next[i].qty + line.qty) };
        return next;
      }
      return [...prev, { ...line, qty: Math.min(20, Math.max(1, line.qty)) }].slice(0, 50);
    });
  }, []);

  const remove = useCallback((slug: string, variantId?: string) => {
    setLines((prev) => prev.filter((l) => !same(l, slug, variantId)));
  }, []);

  const setQty = useCallback((slug: string, variantId: string | undefined, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => !same(l, slug, variantId))
        : prev.map((l) => (same(l, slug, variantId) ? { ...l, qty: Math.min(20, qty) } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const count = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);
  const value = useMemo(
    () => ({ lines, count, add, remove, setQty, clear }),
    [lines, count, add, remove, setQty, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
