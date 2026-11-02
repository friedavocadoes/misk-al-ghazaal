"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import s from "./atelier.module.css";

export function AtelierPanel({
  id,
  art = "fold",
  className = "",
  children,
}: {
  id?: string;
  art?: "fold" | "orbit";
  className?: string;
  children: ReactNode;
}) {
  const sculpture = useRef<HTMLDivElement>(null),
    frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <section
      id={id}
      data-snap-panel
      className={`${s.panel} ${className}`}
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          matchMedia("(prefers-reduced-motion:reduce)").matches
        )
          return;
        const r = event.currentTarget.getBoundingClientRect(),
          x = (event.clientX - r.left) / r.width - 0.5,
          y = (event.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          sculpture.current?.style.setProperty("--mx", `${x * 24}px`);
          sculpture.current?.style.setProperty("--my", `${y * 18}px`);
        });
      }}
      onPointerLeave={() => {
        cancelAnimationFrame(frame.current);
        sculpture.current?.style.setProperty("--mx", "0px");
        sculpture.current?.style.setProperty("--my", "0px");
      }}
    >
      <div className={s.panelGrain} aria-hidden="true" />
      <div
        ref={sculpture}
        className={`${s.sculptureMagnet} ${art === "orbit" ? s.orbitArt : ""}`}
        aria-hidden="true"
      >
        <Image
          data-parallax
          src={`/originales/sculpture-${art}.webp`}
          alt=""
          width={1000}
          height={1000}
          sizes="(max-width:759px) 80vw, 48vw"
          className={s.sculpture}
        />
      </div>
      <div className={s.panelContent}>{children}</div>
    </section>
  );
}
