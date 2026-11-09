"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function CheckoutItems({ label, children }: { label: string; children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const box = viewport.current;
    const content = list.current;
    if (!box || !content) return;
    const sync = () => setMore(box.scrollHeight - box.scrollTop - box.clientHeight > 2);
    const resize = new ResizeObserver(sync);
    resize.observe(box);
    resize.observe(content);
    box.addEventListener("scroll", sync, { passive: true });
    return () => {
      resize.disconnect();
      box.removeEventListener("scroll", sync);
    };
  }, []);

  return (
    <div className="relative flex max-h-44 min-h-14 shrink flex-col overflow-hidden lg:max-h-none">
      <div ref={viewport} tabIndex={0} role="region" aria-label={label}
        className="min-h-0 overflow-y-auto overscroll-contain pe-2 [scrollbar-color:#aa9167_transparent] [scrollbar-width:thin]">
        <ul ref={list} className="divide-y divide-ink/10">{children}</ul>
      </div>
      <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 me-3 h-8 bg-gradient-to-t from-white to-transparent transition-opacity ${more ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
