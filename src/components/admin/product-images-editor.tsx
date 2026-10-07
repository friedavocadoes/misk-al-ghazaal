"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProductImagesEditor({
  productId,
  slug,
  initial,
}: {
  productId: string;
  slug: string;
  initial: string[];
}) {
  const [images, setImages] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);

  async function persist(next: string[]) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("products").update({ images: next }).eq("id", productId);
    setImages(next);
    setSaving(false);
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((src) => (
          <div key={src} className="relative border border-ink/10">
            {/* plain img: admin tool, no next/image optimization needed */}
            <img src={src} alt="" className="aspect-square w-full object-cover" />
            <button
              type="button"
              className="absolute right-1 top-1 bg-ink px-2 py-0.5 text-xs text-white"
              onClick={() => void persist(images.filter((i) => i !== src))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Uploader
          slug={slug}
          onUrl={(url) => void persist([...images, url])}
        />
        {saving && <p className="mt-1 text-xs text-ink/60">Saving…</p>}
        <p className="mt-1 text-xs text-ink/60">
          First image = primary. Stored in Supabase Storage bucket `products` as public URLs.
        </p>
      </div>
    </div>
  );
}

import { ImageUploader } from "./image-uploader";

function Uploader({ slug, onUrl }: { slug: string; onUrl: (u: string) => void }) {
  return <ImageUploader bucket="products" prefix={slug} onUploaded={onUrl} />;
}
