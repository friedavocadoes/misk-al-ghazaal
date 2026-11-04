"use client";
import { useId } from "react";
import s from "./atelier.module.css";

export const FRAME_PATH = "M22 2 H978 L998 22 V578 L978 598 H22 L2 578 V22 Z";
export const OPEN_FRAME =
  "M95 24 Q500 -28 905 24 L977 95 Q1020 300 977 505 L905 576 Q500 628 95 576 L23 505 Q-20 300 23 95 Z";
export const PANEL_FRAME =
  "M35 2H941Q955 2 966 14L989 38Q998 47 998 58V563Q998 598 963 598H59Q45 598 34 586L11 562Q2 553 2 542V37Q2 2 35 2Z";
export const PANEL_ARRIVAL =
  "M108 29Q528 122 897 12Q945 1 972 47L994 89Q998 101 998 123V525Q998 583 940 590Q544 609 87 588Q48 584 28 548L10 512Q2 495 2 474V92Q2 14 108 29Z";

/** Real SVG path morphs; foreground text/controls never scale with the optical frame. */
export function MorphFrame({
  kind = "panel",
}: {
  kind?: "panel" | "button" | "edition";
}) {
  const id = useId().replaceAll(":", "");
  const button = kind === "button";
  const outline = button ? FRAME_PATH : PANEL_FRAME;
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
                d={outline}
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
                kind === "button" ? "var(--studio-button-opacity, .12)" : ".70"
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
                kind === "button" ? "var(--studio-button-opacity, .025)" : ".48"
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
                kind === "button" ? "var(--studio-button-opacity, .09)" : ".52"
              }
            />
          </linearGradient>
        </defs>
        <path
          data-morph-frame
          d={outline}
          fill={`url(#metal-${id})`}
          stroke="currentColor"
          strokeOpacity={button ? ".32" : ".21"}
          vectorEffect="non-scaling-stroke"
        />
        <path
          data-frame-trace
          d={outline}
          fill="none"
          stroke="currentColor"
          strokeOpacity={button ? ".5" : ".26"}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {!button && (
        <span
          className={s.panelSheen}
          style={{ clipPath: `url(#glass-${id})` }}
          aria-hidden="true"
        >
          <span data-panel-light />
        </span>
      )}
    </>
  );
}
