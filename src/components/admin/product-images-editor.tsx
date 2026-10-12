"use client";

import { useState } from "react";
import { MultiImageUploader } from "./multi-image-uploader";
import { toast } from "./admin-form";

/** Product gallery: drag-drop multi-upload, arrow reorder, remove —
    every change persists through the `save` server action (DB write +
    orphan purge + storefront revalidation stay atomic). */
export function ProductImagesEditor({
  productId,
  slug,
  initial,
  save,
}: {
  productId: string;
  slug: string;
  initial: string[];
  save: (productId: string, images: string[]) => Promise<void>;
}) {
  const [images, setImages] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);

  async function persist(next: string[]) {
    setSaving(true);
    try {
      await save(productId, next);
      setImages(next);
      toast("Gallery saved", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "bad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <MultiImageUploader
        bucket="products"
        prefix={slug}
        images={images}
        onChange={(next) => void persist(next)}
      />
      <p className="mt-2 text-xs text-ink/60">
        {saving ? "Saving…" : "First image = primary. Stored in Supabase Storage bucket `products` as public URLs."}
      </p>
    </div>
  );
}
