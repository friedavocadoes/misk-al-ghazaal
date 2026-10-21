"use client";
import { useState, useEffect, useRef } from "react";
import { ImageUploader } from "./image-uploader";
import { toast } from "./admin-form";
export function SampleImage({ initial = "" }: { initial?: string }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = input.current?.form;
    const guard = (e: Event) => {
      if (busy) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toast("Wait for the image upload to finish.", "bad");
      }
    };
    form?.addEventListener("submit", guard, true);
    return () => form?.removeEventListener("submit", guard, true);
  }, [busy]);
  return (
    <div>
      <input ref={input} type="hidden" name="image" value={url} />
      <ImageUploader
        bucket="products"
        prefix="samples"
        onBusyChange={setBusy}
        onUploaded={setUrl}
      />
      {url && <p className="break-all text-xs">{url}</p>}
    </div>
  );
}
