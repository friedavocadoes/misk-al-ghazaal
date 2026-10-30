"use client";

import { imageAsWebp } from "@/lib/image-conversion";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Uploads to the public bucket and returns the public URL.
// Bucket RLS: super_admin writes only. Filenames: <prefix>-<timestamp>.webp
export function ImageUploader({
  bucket,
  prefix,
  onUploaded,
  onBusyChange,
  disabled = false,
  label,
}: {
  bucket: "products" | "banners" | "promo" | "blogs";
  prefix: string;
  onUploaded: (url: string) => unknown;
  disabled?: boolean;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    if (busy || disabled) return;
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    try {
      if (!file.type.startsWith("image/"))
        throw new Error("Pick an image file.");
      if (file.size > 3 * 1024 * 1024) throw new Error("Max 3MB per image.");
      const converted = await imageAsWebp(file);
      const ext = "webp";
      // eslint-disable-next-line react-hooks/purity -- event handler, not render
      const path = `${prefix}-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error: upError } = await supabase.storage
        .from(bucket)
        .upload(path, converted, {
          contentType: "image/webp",
          upsert: false,
        });
      if (upError) throw upError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setLastUrl(data.publicUrl);
      await onUploaded(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const [lastUrl, setLastUrl] = useState<string | null>(null);

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files[0];
          if (file) void pick(file);
        }}
        className="inline-block cursor-pointer border border-ink/20 bg-white px-4 py-2 text-sm transition hover:border-ink/50"
      >
        {busy
          ? "Uploading…"
          : label || `Drop image here or upload to ${bucket}`}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy || disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
            e.target.value = "";
          }}
        />
      </label>
      {lastUrl && (
        <p className="mt-1 break-all text-xs text-ink/60" dir="ltr">
          {lastUrl}
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
