"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string;
  fallback: string;
}

/** next/image with a local fallback (used for /banners/* until you add the files). */
export function SafeImage({ src, fallback, alt, ...props }: SafeImageProps) {
  const [current, setCurrent] = useState(src);
  return (
    <Image
      src={current}
      alt={alt}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
      {...props}
    />
  );
}
