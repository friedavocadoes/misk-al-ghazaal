"use client";
import { useId } from "react";

/** Translucent letter faces, refracted edges and specular highlights; no raster heading. */
export function LiquidName({ name }: { name: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 1200 260" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2=".2" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".8" />
          <stop offset=".22" stopColor="#fff" stopOpacity=".08" />
          <stop offset=".48" stopColor="#fff" stopOpacity=".23" />
          <stop offset=".52" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".57" stopColor="#65717a" stopOpacity=".05" />
          <stop offset="1" stopColor="#fff" stopOpacity=".38" />
        </linearGradient>
        <filter
          id={`${id}-edge`}
          x="-10%"
          y="-30%"
          width="120%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="shape" />
          <feSpecularLighting
            in="shape"
            surfaceScale="3"
            specularConstant=".75"
            specularExponent="24"
            lightingColor="#ffffff"
            result="highlight"
          >
            <fePointLight x="-200" y="-170" z="290" />
          </feSpecularLighting>
          <feComposite
            in="highlight"
            in2="SourceAlpha"
            operator="in"
            result="edge"
          />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="edge" />
          </feMerge>
        </filter>
      </defs>
      <text
        x="600"
        y="200"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="230"
        fontWeight="300"
        letterSpacing="-12"
        textLength="1100"
        lengthAdjust="spacingAndGlyphs"
        fill={`url(#${id}-glass)`}
        stroke="#ffffff"
        strokeOpacity=".55"
        strokeWidth=".7"
        filter={`url(#${id}-edge)`}
      >
        {name}
      </text>
    </svg>
  );
}
