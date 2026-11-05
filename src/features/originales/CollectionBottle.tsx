"use client";

import Image from "next/image";
import { useId, useState } from "react";
import s from "./atelier.module.css";

type Region = readonly [number, number, number, number];
type Registration = { width: number; regions: readonly Region[] };

// Coordinates belong to the local 1100px cutouts, not to catalog data.
// Four registered bands preserve the cap, collar, label O and base positions.
const ARTWORK: Record<string, Registration> = {
  ambrato: {
    width: 915,
    regions: [
      [232, 40, 460, 164],
      [331, 204, 260, 120],
      [153, 324, 622, 238],
      [153, 562, 622, 492],
    ],
  },
  sultanic: {
    width: 886,
    regions: [
      [252, 30, 440, 177],
      [330, 207, 272, 126],
      [162, 333, 624, 245],
      [162, 578, 624, 476],
    ],
  },
  lustra: {
    width: 739,
    regions: [
      [154, 42, 454, 154],
      [260, 196, 242, 121],
      [76, 317, 595, 238],
      [76, 555, 595, 490],
    ],
  },
  lazvaro: {
    width: 701,
    regions: [
      [97, 74, 481, 172],
      [208, 246, 260, 120],
      [25, 366, 624, 248],
      [25, 614, 624, 482],
    ],
  },
};
const FRAME: readonly Region[] = [
  [80, 0, 460, 165],
  [180, 165, 260, 115],
  [0, 280, 620, 240],
  [0, 520, 620, 480],
];
export const COLLECTION_BOTTLE_ASPECT = 620 / 1000;

export function CollectionBottle({
  src,
  name,
  sizes,
}: {
  src: string;
  name: string;
  sizes: string;
}) {
  const registration = ARTWORK[name.toLowerCase()];
  const [decodedSrc, setDecodedSrc] = useState<string | null>(null);
  const id = useId().replace(/:/g, "");
  const artwork = (reflection = false) => {
    if (!registration || !decodedSrc) return null;
    const sourceId = `${id}-${reflection ? "reflection" : "bottle"}`;
    return (
      <svg
        className={
          reflection ? s.registeredReflection : s.registeredBottleArtwork
        }
        data-bottle-artwork={reflection ? undefined : ""}
        viewBox="0 0 620 1000"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden="true"
      >
        <defs>
          <image
            id={sourceId}
            href={decodedSrc}
            width={registration.width}
            height="1100"
          />
        </defs>
        {FRAME.map(([x, y, width, height], index) => {
          const [left, top, cropWidth, cropHeight] =
            registration.regions[index];
          // A subpixel overlap prevents raster seams at adjacent clip boundaries.
          const overlap = 0.25;
          const bleed = (overlap * cropHeight) / height;
          return (
            <svg
              key={index}
              x={x}
              y={y - overlap}
              width={width}
              height={height + overlap * 2}
              viewBox={`${left} ${top - bleed} ${cropWidth} ${cropHeight + bleed * 2}`}
              preserveAspectRatio="none"
              overflow="hidden"
            >
              <use href={`#${sourceId}`} />
            </svg>
          );
        })}
      </svg>
    );
  };
  return (
    <span
      className={s.galleryBottlePlane}
      data-registered-bottle={registration ? "" : undefined}
      data-registration-ready={!!decodedSrc}
    >
      <Image
        data-chapter-bottle
        src={src}
        alt={name}
        width={650}
        height={1000}
        priority
        sizes={sizes}
        className={s.sequenceBottle}
        onLoad={(event) => setDecodedSrc(event.currentTarget.currentSrc)}
      />
      {artwork()}
      {registration && (
        <span
          data-gallery-reflection
          className={s.galleryReflection}
          aria-hidden="true"
        >
          {artwork(true)}
        </span>
      )}
    </span>
  );
}
