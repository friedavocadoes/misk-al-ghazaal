"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
type Prompt = {
  orderId: string;
  items: { id: string; slug: string; title: string }[];
};
export function ReviewInvitation() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const path = usePathname();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    let generation = 0;
    const db = createClient();
    const schedule = (user: unknown) => {
      clearTimeout(timer);
      generation++;
      setPrompt(null);
      if (!user) return;
      const version = generation;
      timer = setTimeout(async () => {
        if (document.hidden || /checkout|account|cart/.test(location.pathname))
          return;
        try {
          const r = await fetch("/api/review-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
          const data = await r.json();
          if (live && version === generation) setPrompt(data.prompt);
        } catch {
          /* Silent invitation failure. */
        }
      }, 45000);
    };
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((event, session) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT"
      )
        schedule(session?.user);
    });
    return () => {
      live = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);
  function close(state: "dismissed" | "opened") {
    if (prompt)
      void fetch("/api/review-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: prompt.orderId, state }),
      }).catch(() => {});
    setPrompt(null);
  }
  if (!prompt || /checkout|account|cart/.test(path)) return null;
  return (
    <aside
      aria-label="Review your recent purchase"
      className="fixed bottom-5 end-5 z-50 w-[calc(100%-40px)] max-w-sm rounded-2xl border border-gold/20 bg-[#fffdf7] p-6 shadow-[0_12px_60px_#33251024]"
    >
      <button
        aria-label="Dismiss review invitation"
        onClick={() => close("dismissed")}
        className="absolute end-4 top-3 p-2"
      >
        ×
      </button>
      <p className="eyebrow text-gold">A little time with your scent</p>
      <h2 className="mt-3 text-2xl font-light">How does it feel?</h2>
      <p className="my-3 text-sm leading-6 text-fog">
        Your order has arrived. We&apos;d love to hear what you think, whenever
        you&apos;re ready.
      </p>
      <div className="space-y-2">
        {prompt.items.slice(0, 3).map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.slug}#reviews`}
            onClick={() => close("opened")}
            className="block rounded-lg border border-ink/10 px-3 py-3 text-sm hover:bg-sand"
          >
            {item.title} <span className="text-gold">↗</span>
          </Link>
        ))}
      </div>
      <button
        onClick={() => close("dismissed")}
        className="mt-4 text-xs text-fog underline"
      >
        No thanks
      </button>
    </aside>
  );
}
