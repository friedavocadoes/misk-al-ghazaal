"use client";
import { useId } from "react";
import s from "./atelier.module.css";

export const FRAME_PATH = "M22 2 H978 L998 22 V578 L978 598 H22 L2 578 V22 Z";
export const OPEN_FRAME =
  "M95 24 Q500 -28 905 24 L977 95 Q1020 300 977 505 L905 576 Q500 628 95 576 L23 505 Q-20 300 23 95 Z";

/** Real SVG path morphs; foreground text/controls never scale with the optical frame. */
export function MorphFrame({
  kind = "panel",
}: {
  kind?: "panel" | "button" | "edition";
}) {
  const id = useId().replaceAll(":", "");
  return (
    <>
      {kind !== "button" && (
        <span
          className={s.glassBlur}
          style={{ clipPath: `url(#glass-${id})` }}
          aria-hidden="true"
          data-glass-blur
        />
      )}
      <svg
        data-morph-surface={kind}
        className={s.morphFrame}
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {kind !== "button" && (
            <clipPath id={`glass-${id}`} clipPathUnits="objectBoundingBox">
              <path
                data-morph-clip
                d={FRAME_PATH}
                transform="scale(.001 .001666666667)"
              />
            </clipPath>
          )}
          <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop
              stopColor={
                kind === "button"
                  ? "var(--studio-button-highlight, #d8d8c4)"
                  : "var(--studio-card-light, #101813)"
              }
              stopOpacity={
                kind === "button" ? "var(--studio-button-opacity, .12)" : ".90"
              }
            />
            <stop
              offset=".45"
              stopColor={
                kind === "button"
                  ? "var(--studio-button-body, #9ca6a0)"
                  : "var(--studio-card, #101813)"
              }
              stopOpacity={
                kind === "button" ? "var(--studio-button-opacity, .025)" : ".60"
              }
            />
            <stop
              offset="1"
              stopColor={
                kind === "button"
                  ? "var(--studio-button-shadow, #d2bb80)"
                  : "var(--studio-card, #101813)"
              }
              stopOpacity={
                kind === "button" ? "var(--studio-button-opacity, .09)" : ".72"
              }
            />
          </linearGradient>
        </defs>
        <path
          data-morph-frame
          d={FRAME_PATH}
          fill={`url(#metal-${id})`}
          stroke="currentColor"
          strokeOpacity=".32"
          vectorEffect="non-scaling-stroke"
        />
        <path
          data-frame-trace
          d={FRAME_PATH}
          fill="none"
          stroke="currentColor"
          strokeOpacity=".5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </>
  );
}
