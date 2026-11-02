"use client";
import { LiquidEffectAnimation } from "./LiquidEffect";
import s from "./atelier.module.css";

export function HeroLiquid({ imageSrc }: { imageSrc?: string }) {
  return (
    <div className={s.heroLiquid} data-hero-liquid aria-hidden="true">
      <LiquidEffectAnimation imageSrc={imageSrc} />
    </div>
  );
}
