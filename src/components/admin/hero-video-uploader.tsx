"use client";
import { useEffect, useRef, useState } from "react";
import { Film, Loader2, Upload } from "lucide-react";
export function HeroVideoUploader({
  onUploaded,
  onBusyChange,
  disabled = false,
  device = "desktop",
}: {
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  device?: "desktop" | "mobile";
  onUploaded: (src: string, poster: string) => void | Promise<void>;
}) {
  const [stage, setStage] = useState<"" | "upload" | "process" | "save">("");
  const [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const request = useRef<XMLHttpRequest | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  async function pick(file: File) {
    if (request.current || stage || disabled) return;
    if (!file.type.startsWith("video/") || file.size > 30 * 1024 * 1024) {
      setError("Choose a video under 30 MB.");
      return;
    }
    setError("");
    setProgress(0);
    setStage("upload");
    onBusyChange?.(true);
    try {
      const data = await new Promise<{ src: string; poster: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          request.current = xhr;
          xhr.open("POST", "/api/admin/hero-video");
        xhr.timeout = 300000;
          xhr.upload.onprogress = (e) => {
            if (mounted.current && e.lengthComputable)
              setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.upload.onload = () => {
            if (mounted.current) setStage("process");
          };
          xhr.onload = () => {
            try {
            let body:{error?:string;src?:string;poster?:string}={};
            try{body=JSON.parse(xhr.responseText);}catch{/* Hosting errors may return HTML. */}
            if(xhr.status===413)throw new Error("This host rejected the file size. Try a smaller source video.");
              if (xhr.status < 200 || xhr.status >= 300)
              throw new Error(body.error || "Video upload or processing failed. Try a smaller source video.");
            if(!body.src||!body.poster)throw new Error("Video processing returned no artwork. Please try again.");
            resolve({src:body.src,poster:body.poster});
            } catch (e) {
              reject(e);
            }
          };
          xhr.onerror = () =>
            reject(new Error("Connection lost. Please try the upload again."));
          xhr.ontimeout = () =>
            reject(
              new Error(
                "Processing timed out. Try a shorter or smaller video.",
              ),
            );
          xhr.onabort = () => reject(new Error("Upload cancelled."));
          const form = new FormData();
          form.set("file", file);
          form.set("device", device);
          xhr.send(form);
        },
      );
      if (!mounted.current) return;
      setStage("save");
      await onUploaded(data.src, data.poster);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      request.current = null;
      if (mounted.current) {
        setStage("");
        onBusyChange?.(false);
      }
    }
  }
  return (
    <div className="banner-video-upload" aria-busy={!!stage}>
      <label
        className={`banner-upload-drop ${stage || disabled ? "is-busy" : ""}`}
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
      >
        {stage ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Film className="size-5" />
        )}
        <span>
          {stage ? "Preparing your video" : "Drop a video or choose a file"}
          <small>MP4, MOV or WebM · up to 30 MB</small>
        </span>
        <Upload className="ms-auto size-4" />
        <input
          type="file"
          accept="video/*"
          disabled={!!stage || disabled}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void pick(file);
          }}
        />
      </label>
      {stage && (
        <div className="banner-processing" role="status" aria-live="polite">
          <strong>
            {stage === "upload"
              ? `Uploading source · ${progress}%`
              : stage === "process"
                ? "Optimizing video & generating poster…"
                : "Saving artwork…"}
          </strong>
          <div
            className={
              stage === "upload"
                ? "banner-progress"
                : "banner-progress is-indeterminate"
            }
            role="progressbar"
            aria-label="Video preparation"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stage === "upload" ? progress : undefined}
          >
            <i
              style={stage === "upload" ? { width: `${progress}%` } : undefined}
            />
          </div>
          <p>
            {stage === "process"
              ? "This can take up to two minutes. Keep this page open; publishing is locked until it finishes."
              : "Your existing artwork stays live until the new media is saved."}
          </p>
        </div>
      )}
      <p className="banner-upload-hint">
        Silent H.264 MP4 + WebP poster · first 20 seconds · up to 30 fps.{" "}
        {device === "mobile"
          ? "Portrait up to 1080 × 1920."
          : "Landscape up to 1920 × 1080."}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
