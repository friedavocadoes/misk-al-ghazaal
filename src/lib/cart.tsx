"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem } from "./types";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(KEY, JSON.stringify(lines));
      } catch {
        /* storage full/blocked — cart still works in memory */
      }
    }
  }, [lines, ready]);

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
