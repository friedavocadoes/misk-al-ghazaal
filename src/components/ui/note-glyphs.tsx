"use client";

import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";

import { DEFAULT_NOTE_GLYPH } from "@/lib/note-artwork";
export { DEFAULT_NOTE_GLYPH } from "@/lib/note-artwork";

/** Legacy icon keys deliberately resolve to our own artwork. Uploaded colors and alpha are preserved. */
export function NoteGlyph({ glyph, className = "size-16", style }: {
  glyph?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const src = glyph?.startsWith("https://") || glyph?.startsWith("/") ? glyph : DEFAULT_NOTE_GLYPH;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={style} aria-hidden="true">
      <Image src={failedSrc === src ? DEFAULT_NOTE_GLYPH : src} alt="" fill sizes="(max-width: 640px) 80px, 112px" unoptimized className="object-contain" onError={() => setFailedSrc(src)} />
    </span>
  );
}
