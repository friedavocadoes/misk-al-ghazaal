"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Floating share cluster for the gallery: native sheet first, then
    WhatsApp / X / Facebook / copy-link fallbacks. */
export function ShareButtons({ title, label, copiedLabel }: { title: string; label: string; copiedLabel: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const href = () => window.location.href;
  const text = () => `${title} — Misk Al Ghazaal`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href());
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: text(), url: href() });
      } catch {
        /* dismissed */
      }
    } else {
      setOpen((v) => !v);
    }
  };

  const targets = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${text()} ${typeof window !== "undefined" ? window.location.href : ""}`)}`,
      glyph: (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className="size-4">
          <path d="M16 3C9.4 3 4 8.4 4 15c0 2.4.7 4.6 2 6.5L4 27l5.7-1.5c1.8 1 3.9 1.5 6.3 1.5 6.6 0 12-5.4 12-12S22.6 3 16 3zm5.2 16.9c-.2.6-.9 1.1-1.6 1.2-.4.1-.9.1-1.4-.1-.6-.2-1.4-.5-2.4-1-2.5-1-4.6-2.9-5.4-3.9-.4-.5-.9-1.1-1-1.9-.1-.8.3-1.6 1-2.3.2-.3.7-.6 1-.6h.6c.2 0 .5.1.7.5.3.7 1 2.4 1.1 2.6.1.2.1.4 0 .7-.1.2-.2.4-.4.6-.2.2-.4.4-.2.7.2.3.8 1.4 1.8 2.2.9.8 1.7 1.2 2 .1.3-.1.5-.2.7-.4.2-.2.4-.2.7-.1.3.1 1.9.9 2.2 1 .1.3.1.4 0 .6z" />
        </svg>
      ),
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text())}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
      glyph: <span className="text-sm font-bold">X</span>,
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`,
      glyph: <span className="text-sm font-bold">f</span>,
    },
  ];

  return (
    <div className="absolute end-3 top-3 z-10 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={native}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "flex size-10 items-center justify-center border backdrop-blur-md transition-all",
          open
            ? "border-ink bg-ink text-white"
            : "border-ink/15 bg-white/85 text-ink hover:border-ink",
        )}
      >
        <Share2 className="size-4" />
      </button>
      <div
        className={cn(
          "flex flex-col gap-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        {targets.map((tg) => (
          <a
            key={tg.name}
            href={tg.href}
            target="_blank"
            rel="noreferrer"
            aria-label={tg.name}
            title={tg.name}
            tabIndex={open ? 0 : -1}
            className="flex size-10 items-center justify-center border border-ink/15 bg-white/85 text-ink backdrop-blur-md transition hover:border-ink hover:bg-ink hover:text-white"
          >
            {tg.glyph}
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          aria-label="Copy link"
          tabIndex={open ? 0 : -1}
          className="flex size-10 items-center justify-center border border-ink/15 bg-white/85 text-ink backdrop-blur-md transition hover:border-ink hover:bg-ink hover:text-white"
        >
          {copied ? <Check className="size-4 text-[#1e7a46]" /> : <Link2 className="size-4" />}
        </button>
      </div>
      {copied && (
        <span className="border border-ink/15 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink backdrop-blur-md">
          {copiedLabel}
        </span>
      )}
    </div>
  );
}
