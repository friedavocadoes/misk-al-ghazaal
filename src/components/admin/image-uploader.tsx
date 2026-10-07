"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Uploads to the public bucket and returns the public URL.
// Bucket RLS: super_admin writes only. Filenames: <prefix>-<timestamp>.webp
export function ImageUploader({
  bucket,
  prefix,
  onUploaded,
}: {
  bucket: "products" | "banners";
  prefix: string;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Pick an image file.");
      if (file.size > 3 * 1024 * 1024) throw new Error("Max 3MB per image.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
      const path = `${prefix}-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error: upError } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upError) throw upError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="inline-block cursor-pointer border border-ink/20 bg-white px-4 py-2 text-sm">
        {busy ? "Uploading…" : `Upload to ${bucket}`}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
