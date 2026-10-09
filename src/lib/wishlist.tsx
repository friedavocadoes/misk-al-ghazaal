"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient as createBrowserClient } from "./supabase/client";

interface WishlistCtx {
  ids: string[];
  userId: string | null;
  has: (slug: string) => boolean;
  /** Returns 'login' for guests (caller routes to login). */
  toggle: (slug: string) => Promise<"added" | "removed" | "login" | "error">;
}

const Ctx = createContext<WishlistCtx | null>(null);

function clean(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.filter((s): s is string => typeof s === "string"))].slice(0, 200);
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserClient();
    sb.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) =>
      setUserId(session?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Pull on login; clear on logout (wishlist is account-bound).
  useEffect(() => {
    let live = true;
    void (async () => {
      if (!userId) {
        if (live) setIds([]);
        return;
      }
      try {
        const { data } = await createBrowserClient()
          .from("profiles")
          .select("wishlist")
          .eq("id", userId)
          .single();
        if (live) setIds(clean((data as { wishlist?: unknown } | null)?.wishlist));
      } catch {
        /* offline/RLS — empty wishlist */
      }
    })();
    return () => {
      live = false;
    };
  }, [userId]);

  const toggle = useCallback(
    async (slug: string): Promise<"added" | "removed" | "login" | "error"> => {
      if (!userId) return "login";
      const adding = !ids.includes(slug);
      const next = adding ? [...ids, slug].slice(0, 200) : ids.filter((s) => s !== slug);
      setIds(next);
      const { error } = await createBrowserClient()
        .from("profiles")
        .update({ wishlist: next })
        .eq("id", userId);
      if (error) {
        setIds(ids);
        return "error";
      }
      return adding ? "added" : "removed";
    },
    [ids, userId],
  );

  const has = useCallback((slug: string) => ids.includes(slug), [ids]);
  const value = useMemo(
    () => ({ ids, userId, has, toggle }),
    [ids, userId, has, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishlistCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
