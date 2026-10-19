"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string;
  fallback: string;
}

/** Responsive, optimized images with an optional fallback. */
export function SafeImage({ src, fallback, alt, ...props }: SafeImageProps) {
  const [current, setCurrent] = useState(src);
  return (
    <Image
      src={current}
      alt={alt}
      unoptimized={current.startsWith("http") && !/^https:\/\/[^/]+\.supabase\.co\//.test(current)}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
      }}
      {...props}
    />
  );
}
