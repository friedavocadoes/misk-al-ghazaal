"use client";
/* eslint-disable @next/next/no-img-element -- Admin previews display original uploaded artwork without an optimization round trip. */
import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { ImageUploader } from "./image-uploader";
import { HeroVideoUploader } from "./hero-video-uploader";
import { bannerIsVideo } from "@/lib/banner-config";

export function BannerMediaUpload({
  src,
  poster,
  onChange,
  onBusyChange,
  allowVideo,
  device = "desktop",
  disabled = false,
}: {
  src: string;
  poster: string;
  allowVideo: boolean;
  device?: "desktop" | "mobile";
  disabled?: boolean;
  onChange: (src: string, poster: string) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [imageBusy, setImageBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [urlBusy, setUrlBusy] = useState(false),
    [urlError, setUrlError] = useState("");
  const sourceInput = useRef<HTMLInputElement>(null),
    posterInput = useRef<HTMLInputElement>(null);
  function imageState(busy: boolean) {
    setImageBusy(busy);
    onBusyChange?.(busy || videoBusy);
  }
  function videoState(busy: boolean) {
    setVideoBusy(busy);
    onBusyChange?.(busy || imageBusy);
  }
  return (
    <div
      className="banner-media-upload"
      aria-busy={imageBusy || videoBusy || urlBusy}
    >
      <div
        className={`banner-media-preview ${device === "mobile" ? "is-mobile" : ""}`}
      >
        {src ? (
          bannerIsVideo(src) ? (
            <video
              src={src}
              poster={poster || undefined}
              controls
              muted
              playsInline
              preload="none"
            />
          ) : (
            <img src={src} alt="Banner artwork preview" loading="lazy" />
          )
        ) : (
          <div>
            <ImageIcon className="size-7" />
            <p>No artwork yet</p>
          </div>
        )}
      </div>
      <div className="banner-image-upload">
        <ImageUploader
          bucket="banners"
          label="Drop an image or choose a file"
          prefix={`banner-${device}`}
          disabled={disabled || videoBusy || urlBusy}
          onBusyChange={imageState}
          onUploaded={(url) => onChange(url, "")}
        />
      </div>
      {imageBusy && (
        <p role="status" className="banner-upload-status">
          <Loader2 className="size-4 animate-spin" /> Optimizing to WebP,
          uploading & saving…
        </p>
      )}
      {allowVideo && (
        <HeroVideoUploader
          device={device}
          disabled={disabled || imageBusy || urlBusy}
          onBusyChange={videoState}
          onUploaded={onChange}
        />
      )}
      {src && (
        <details className="banner-media-advanced">
          <summary>Poster / fallback image</summary>
          <p className="banner-upload-hint">
            Optional for images. Video uploads generate their own poster.
          </p>
          {poster && (
            <img
              src={poster}
              alt="Current fallback"
              loading="lazy"
              className="mt-2 max-h-24"
            />
          )}
          <ImageUploader
            bucket="banners"
            prefix={`banner-${device}-poster`}
            disabled={disabled || imageBusy || videoBusy || urlBusy}
            onBusyChange={imageState}
            onUploaded={(url) => onChange(src, url)}
          />
        </details>
      )}
      <details className="banner-media-advanced">
        <summary>Use an existing media URL</summary>
        <div className="mt-3 space-y-3">
          <label className="banner-field">
            Image or optimized MP4 URL
            <input
              key={src}
              ref={sourceInput}
              defaultValue={src}
              placeholder="https://… or /banners/…"
              disabled={disabled || imageBusy || videoBusy || urlBusy}
            />
          </label>
          <label className="banner-field">
            Poster / fallback URL
            <input
              key={poster}
              ref={posterInput}
              defaultValue={poster}
              placeholder="Optional image URL"
              disabled={disabled || imageBusy || videoBusy || urlBusy}
            />
          </label>
          <button
            type="button"
            className="banner-quiet"
            disabled={disabled || imageBusy || videoBusy || urlBusy}
            onClick={async () => {
              const next = sourceInput.current?.value.trim() || "",
                fallback = posterInput.current?.value.trim() || "";
              if (!next || (!allowVideo && bannerIsVideo(next))) {
                setUrlError("Enter an image URL for this placement.");
                return;
              }
              setUrlBusy(true);
              onBusyChange?.(true);
              setUrlError("");
              try {
                await onChange(next, fallback);
              } catch (e) {
                setUrlError(
                  e instanceof Error ? e.message : "Could not save URL",
                );
              } finally {
                setUrlBusy(false);
                onBusyChange?.(false);
              }
            }}
          >
            {urlBusy ? "Saving…" : "Use this artwork"}
          </button>
          {urlError && (
            <p role="alert" className="text-sm text-red-700">
              {urlError}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
