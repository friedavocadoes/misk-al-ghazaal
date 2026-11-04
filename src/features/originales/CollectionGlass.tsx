import { useId, type CSSProperties } from "react";
import s from "./atelier.module.css";

const panes = [
  {
    tone: "#d4843c",
    x: 18,
    shape: "M-30 660V354Q82 168 280 118V634Z",
    edge: "M-30 354Q82 168 280 118V634",
  },
  {
    tone: "#e7b572",
    x: null,
    shape: "M228 -40H464L443 612L228 651Z",
    edge: "M228 -40V651M443 612L464 -40",
  },
  {
    tone: "#477e65",
    x: 39,
    shape: "M448 -35H713L687 616L431 644Z",
    edge: "M448 -35L431 644M687 616L713 -35",
  },
  {
    tone: "#ac466b",
    x: 61,
    shape: "M854 -30H1064L1037 616L864 634Z",
    edge: "M854 -30L864 634M1037 616L1064 -30",
  },
  {
    tone: "#5388d0",
    x: 82,
    shape: "M990 647V452Q1090 284 1478 156V635Z",
    edge: "M990 647V452Q1090 284 1478 156",
  },
];
const waves = [
  {
    surface: "M-30 805C200 783 346 1016 659 1029H-30Z",
    edge: "M-30 805C200 783 346 1016 659 1029",
  },
  {
    surface:
      "M795 1057C1030 828 1269 950 1470 705V946C1289 1044 1099 991 795 1057Z",
    edge: "M795 1057C1030 828 1269 950 1470 705",
  },
];

export function CollectionGlass() {
  const id = useId();
  return (
    <div data-collection-glass className={s.collectionGlass} aria-hidden="true">
      <svg viewBox="0 0 1440 1000" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}-foot`} x2="0" y2="1">
            <stop offset=".75" stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask
            id={`${id}-foot-mask`}
            maskUnits="userSpaceOnUse"
            x="-30"
            y="-40"
            width="1510"
            height="700"
          >
            <rect
              x="-30"
              y="-40"
              width="1510"
              height="700"
              fill={`url(#${id}-foot)`}
            />
          </mask>
          <linearGradient id={`${id}-edge`} x1="0" y1="0" x2=".8" y2="1">
            <stop stopColor="#f6d3a0" stopOpacity=".08" />
            <stop offset=".33" stopColor="#ffe3b5" stopOpacity=".62" />
            <stop offset=".59" stopColor="#eed0ac" stopOpacity=".17" />
            <stop offset=".85" stopColor="#ffe3b5" stopOpacity=".74" />
            <stop offset="1" stopColor="#f6d3a0" stopOpacity=".08" />
          </linearGradient>
          <linearGradient id={`${id}-wave`} x1="0" y1="0" x2=".75" y2=".6">
            <stop stopColor="#fff0cf" stopOpacity=".19" />
            <stop offset=".3" stopColor="#a86b42" stopOpacity=".25" />
            <stop offset="1" stopColor="#a58d78" stopOpacity="0" />
          </linearGradient>
          {panes.map(({ tone }, index) => (
            <linearGradient key={tone} id={`${id}-pane-${index}`}>
              <stop stopColor={tone} stopOpacity=".28" />
              <stop offset=".08" stopColor={tone} stopOpacity=".13" />
              <stop offset=".57" stopColor={tone} stopOpacity=".055" />
              <stop offset=".94" stopColor={tone} stopOpacity=".3" />
              <stop offset="1" stopColor="#ffe8ce" stopOpacity=".08" />
            </linearGradient>
          ))}
        </defs>
        <g mask={`url(#${id}-foot-mask)`}>
          {panes.map(({ tone, shape, edge }, index) => (
            <g
              key={tone}
              className={s.glassPane}
              style={{ "--glass-delay": `${index * -2.4}s` } as CSSProperties}
            >
              <path d={shape} fill={`url(#${id}-pane-${index})`} />
              <path
                d={edge}
                stroke={`url(#${id}-edge)`}
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className={s.glassGlint}
                d={edge}
                pathLength="100"
                stroke="#ffe9c1"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </g>
        {waves.map(({ surface, edge }, index) => (
          <g
            key={edge}
            className={s.glassWave}
            style={{ "--glass-delay": `${index * -5}s` } as CSSProperties}
          >
            <path d={surface} fill={`url(#${id}-wave)`} />
            <path
              d={edge}
              stroke={`url(#${id}-edge)`}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <path
              className={s.glassGlint}
              d={edge}
              pathLength="100"
              stroke="#ffe9c1"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      <div className={s.collectionFloor}>
        <div className={s.glassFloor} />
        {panes
          .filter(({ x }) => x !== null)
          .map(({ tone, x }, index) => (
            <span
              key={tone}
              className={s.floorLight}
              style={
                {
                  "--pool": tone,
                  "--pool-x": `${x}%`,
                  "--glass-delay": `${index * -3}s`,
                } as CSSProperties
              }
            />
          ))}
      </div>
    </div>
  );
}
