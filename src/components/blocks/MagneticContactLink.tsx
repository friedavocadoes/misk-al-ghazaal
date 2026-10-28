"use client";
import { useRef, type ReactNode } from "react";
export function MagneticContactLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  const frame = useRef(0);
  const box = useRef<DOMRect | null>(null);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="magnetic-contact"
      onPointerEnter={(e) => {
        if (
          e.pointerType !== "mouse" ||
          !matchMedia("(hover:hover) and (pointer:fine)").matches ||
          matchMedia("(prefers-reduced-motion:reduce)").matches
        )
          return;
        box.current = e.currentTarget.getBoundingClientRect();
      }}
      onPointerMove={(e) => {
        if (!box.current || e.pointerType !== "mouse") return;
        const node = e.currentTarget,
          rect = box.current;
        const x = Math.max(
          -7,
          Math.min(7, (e.clientX - rect.left - rect.width / 2) * 0.065),
        );
        const y = Math.max(
          -6,
          Math.min(6, (e.clientY - rect.top - rect.height / 2) * 0.1),
        );
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          node.style.setProperty("--magnet-x", `${x}px`);
          node.style.setProperty("--magnet-y", `${y}px`);
        });
      }}
      onPointerLeave={(e) => {
        cancelAnimationFrame(frame.current);
        box.current = null;
        e.currentTarget.style.setProperty("--magnet-x", "0px");
        e.currentTarget.style.setProperty("--magnet-y", "0px");
      }}
      onBlur={(e) => {
        e.currentTarget.style.setProperty("--magnet-x", "0px");
        e.currentTarget.style.setProperty("--magnet-y", "0px");
      }}
    >
      <span className="magnetic-contact-surface">
        {children}
        <span className="magnetic-contact-arrow" aria-hidden>
          ↗
        </span>
      </span>
    </a>
  );
}
