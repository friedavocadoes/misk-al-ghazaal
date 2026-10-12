"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MultiImageUploader } from "./multi-image-uploader";
import { toast } from "./admin-form";

/** Product gallery: drag-drop multi-upload, arrow reorder, remove —
    every change persists straight to products.images. */
export function ProductImagesEditor({
  productId,
  slug,
  initial,
  revalidate,
}: {
  productId: string;
  slug: string;
  initial: string[];
  revalidate: (productId: string) => Promise<void>;
}) {
  const [images, setImages] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);

  async function persist(next: string[]) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("products").update({ images: next }).eq("id", productId);
      if (error) throw error;
      setImages(next);
      // Browser-client writes skip server actions — refresh the PDP +
      // listings explicitly or the storefront stays stale.
      await revalidate(productId);
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
