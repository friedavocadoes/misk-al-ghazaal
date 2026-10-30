"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string;
  fallback: string;
}

/** Responsive, optimized images with an optional fallback. */
export function SafeImage({ src, fallback, alt, ...props }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // Follow viewport/source changes immediately; fallback belongs to the failed source only.
  const current = failedSrc === src && fallback ? fallback : src;
  return (
    <Image
      src={current}
      alt={alt}
      unoptimized={current.startsWith("http") && !/^https:\/\/[^/]+\.supabase\.co\//.test(current)}
      onError={() => {
        if (fallback && current !== fallback) setFailedSrc(src);
      }}
      {...props}
    />
  );
}
