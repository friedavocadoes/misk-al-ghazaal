"use client";
import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import s from "./atelier.module.css";

const Liquid = dynamic(
  () => import("./LiquidEffect").then((m) => m.LiquidEffectAnimation),
  { ssr: false },
);
const subscribe = (update: () => void) => {
  const media = matchMedia("(min-width:760px)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
};
const desktop = () => matchMedia("(min-width:760px)").matches;
const server = () => false;
export function HeroLiquid({ imageSrc }: { imageSrc?: string }) {
  const enabled = useSyncExternalStore(subscribe, desktop, server);
  if (!enabled) return null;
  return (
    <div className={s.heroLiquid} data-hero-liquid aria-hidden="true">
      <Liquid imageSrc={imageSrc} />
    </div>
  );
}
