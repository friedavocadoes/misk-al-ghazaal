"use client";
import { type ReactNode } from "react";
import { MorphFrame } from "./MorphFrame";
import s from "./atelier.module.css";

export function AtelierPanel({
  id,
  art = "fold",
  className = "",
  children,
  finale = false,
}: {
  id?: string;
  art?: "fold" | "orbit";
  className?: string;
  children: ReactNode;
  finale?: boolean;
}) {
  return (
    <section
      id={id}
      data-snap-panel
      data-gallery-finale={finale || undefined}
      className={`${s.panel} ${className}`}
      data-panel-tone={art}
    >
      <div className={s.panelGrain} aria-hidden="true" />
      <div className={s.panelContent}>
        <MorphFrame />
        {children}
      </div>
    </section>
  );
}
