"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_MB = 3;
const MAX_IMAGES = 12;

/** Multi-image field: click or drag-and-drop 3–4 (or more) files at once,
    then reorder with arrows — first image stays the primary. */
export function MultiImageUploader({
  bucket,
  prefix,
  images,
  onChange,
}: {
  bucket: "products" | "banners";
  prefix: string;
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const put = async (files: FileList | File[]) => {
    const picked = [...files].filter((f) => f.type.startsWith("image/"));
    if (!picked.length) {
      setError("Pick image files (JPG/PNG/WebP).");
      return;
    }
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(`Max ${MAX_IMAGES} images.`);
      return;
    }
    setError(null);
    setUploading((n) => n + Math.min(picked.length, room));
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const file of picked.slice(0, room)) {
        if (file.size > MAX_MB * 1024 * 1024) throw new Error(`${file.name}: max ${MAX_MB}MB.`);
        const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
        const path = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
        const { error: upError } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upError) throw upError;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        urls.push(data.publicUrl);
        setUploading((n) => n - 1);
      }
      onChange([...images, ...urls]);
    } catch (e) {
      setUploading(0);
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  return (
    <div>
      {images.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <div key={src + i} className="group relative border border-ink/10 bg-white">
              <img src={src} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(images.filter((_, x) => x !== i))}
                aria-label="Remove image"
                className="absolute right-1 top-1 cursor-pointer bg-ink/80 p-1 text-white transition hover:bg-[#9c2b2e]"
              >
                <X className="size-3.5" />
              </button>
              <span className="absolute bottom-1 left-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move left"
                  className="cursor-pointer bg-white/95 p-1 text-ink shadow transition hover:bg-ink hover:text-white disabled:opacity-30"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={i === images.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move right"
                  className="cursor-pointer bg-white/95 p-1 text-ink shadow transition hover:bg-ink hover:text-white disabled:opacity-30"
                >
                  <ArrowRight className="size-3.5" />
                </button>
              </span>
            </div>
          ))}
          {uploading > 0 &&
            Array.from({ length: uploading }).map((_, i) => (
              <div key={`u-${i}`} className="flex aspect-square items-center justify-center border border-dashed border-ink/25 bg-cream">
                <Loader2 className="size-5 animate-spin text-fog" />
              </div>
            ))}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload images"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void put(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition",
          dragOver ? "border-gold bg-gold-wash/60" : "border-ink/25 bg-white hover:border-ink/50",
        )}
      >
        <UploadCloud className={cn("size-6", dragOver ? "text-gold" : "text-fog")} />
        <p className="text-sm text-espresso">
          Drag & drop up to 4 images here, or <span className="link-underline text-ink">browse</span>
        </p>
        <p className="text-xs text-ink/50">JPG / PNG / WebP · max {MAX_MB}MB each · first = primary</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void put(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
