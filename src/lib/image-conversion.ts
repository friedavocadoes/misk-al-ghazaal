/** Convert before Storage upload; existing WebP bytes are preserved. */
export async function imageAsWebp(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return new File([file], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  }
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/images/convert", { method: "POST", body });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Image conversion failed. Nothing was uploaded.");
  }
  return new File([await response.blob()], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}
