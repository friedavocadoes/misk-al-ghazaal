"use client";
import { useEffect, useRef } from "react";
import s from "./originales.module.css";

/** One semantic title, with an optional physically rendered material on its letter faces. */
export function LiquidName({
  name,
  backdrop,
}: {
  name: string;
  backdrop: string | null;
}) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = host.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const memory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    if (!node || reduced.matches || connection?.saveData || (memory ?? 8) <= 2)
      return;
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    import("./glass-name-renderer")
      .then(async ({ mountGlassName }) => {
        if (controller.signal.aborted) return;
        dispose = await mountGlassName(node, name, backdrop, controller.signal);
      })
      .catch(() => {
        /* The same readable title is the fallback. */
      });
    const preferenceChanged = () => {
      if (reduced.matches) controller.abort();
    };
    reduced.addEventListener("change", preferenceChanged);
    return () => {
      controller.abort();
      dispose?.();
      reduced.removeEventListener("change", preferenceChanged);
    };
  }, [name, backdrop]);
  return (
    <>
      <span className={s.titleLetters}>{name}</span>
      <span ref={host} className={s.glassLetters} aria-hidden="true" />
    </>
  );
}
