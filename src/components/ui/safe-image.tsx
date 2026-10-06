"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string;
  fallback: string;
}

/** next/image with a local fallback (used for /banners/* until you add the files).
 *  `unoptimized` keeps missing banner files as quiet browser 404s instead
 *  of tripping Next's image-optimization pipeline with server errors. */
export function SafeImage({ src, fallback, alt, ...props }: SafeImageProps) {
  const [current, setCurrent] = useState(src);
  return (
    <Image
      src={current}
      alt={alt}
      unoptimized
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
      {...props}
    />
  );
}
