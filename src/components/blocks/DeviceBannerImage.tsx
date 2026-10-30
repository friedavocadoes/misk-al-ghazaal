"use client";
import { useEffect, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import type { ComponentProps } from "react";
export function DeviceBannerImage({
  mobileSrc,
  mobileFallback,
  ...props
}: ComponentProps<typeof SafeImage> & {
  mobileSrc?: string;
  mobileFallback?: string;
}) {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const q = matchMedia("(max-width:767px)");
    const update = () => setMobile(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  if (mobileSrc && mobile === null) return null;
  const src = mobile && mobileSrc ? mobileSrc : props.src;
  if (typeof src === "string" && /\.mp4(?:[?#]|$)/i.test(src))
    return (
      <video
        className={
          props.className + " absolute inset-0 h-full w-full object-cover"
        }
        src={src}
        poster={mobile && mobileSrc ? mobileFallback : props.fallback}
        style={props.style}
        muted
        playsInline
        autoPlay
        loop
        preload="metadata"
      />
    );
  return (
    <SafeImage
      {...props}
      src={src}
      fallback={
        mobile && mobileSrc ? mobileFallback || mobileSrc : props.fallback
      }
    />
  );
}
