"use client";

// Adapted from Aceternity UI's lens registry: circular mask + zoomed content.
// Pointer coordinates use CSS variables so movement never re-renders the gallery.
import { useState, type ReactNode } from "react";

export function ProductLens({ children, onActive }: { children: ReactNode; onActive: (active: boolean) => void }) {
  const [active, setActive] = useState(false);
  return <div className="product-lens" data-active={active}
    onPointerEnter={e => {
      if (e.pointerType !== "mouse" || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--lens-x", `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty("--lens-y", `${e.clientY - rect.top}px`);
      setActive(true); onActive(true);
    }}
    onPointerMove={e => {
      if (!active) return;
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--lens-x", `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty("--lens-y", `${e.clientY - rect.top}px`);
    }}
    onPointerLeave={() => { setActive(false); onActive(false); }}>
    {children}
    {active && <div className="product-lens-window" aria-hidden="true"><div className="product-lens-magnified">{children}</div></div>}
    <span className="product-lens-hint" aria-hidden="true">Explore the details · 2×</span>
  </div>;
}
