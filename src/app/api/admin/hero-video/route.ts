import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpeg from "ffmpeg-static";

export const runtime = "nodejs";
export const maxDuration = 120;
const run = promisify(execFile);
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (session?.role !== "super_admin") return Response.json({ error: "Not authorized" }, { status: 403 });
  let directory: string | undefined;
  try {
    if (!ffmpeg) throw new Error("Video processor unavailable on this host.");
    if (Number(request.headers.get("content-length")) > 30 * 1024 * 1024) throw new Error("Maximum source size: 30 MB.");
    const form = await request.formData();
    const device=form.get("device")==="mobile"?"mobile":"desktop";
    const bounds=device==="mobile"?{width:1080,height:1920}:{width:1920,height:1080};
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("video/") || file.size > 30 * 1024 * 1024) throw new Error("Choose a video under 30 MB.");
    directory = await mkdtemp(join(tmpdir(), "misk-hero-"));
    const input = join(directory, "source");
    const output = join(directory, "hero.mp4");
    const poster = join(directory, "poster.webp");
    await writeFile(input, Buffer.from(await file.arrayBuffer()));
    await run(ffmpeg, ["-nostdin", "-y", "-i", input, "-t", "20", "-an", "-vf", `scale=w='min(${bounds.width},iw)':h='min(${bounds.height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30`, "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-threads", "2", output], { timeout: 100000, maxBuffer: 1024 * 1024 });
    await run(ffmpeg, ["-nostdin", "-y", "-i", output, "-frames:v", "1", "-c:v", "libwebp", "-quality", "85", poster], { timeout: 15000, maxBuffer: 1024 * 1024 });
    const db = await createClient();
    const id = crypto.randomUUID();
    const videoPath = `hero-video/${id}.mp4`;
    const posterPath = `hero-video/${id}.webp`;
    const { error } = await db.storage.from("banners").upload(videoPath, await readFile(output), { contentType: "video/mp4" });
    if (error) throw error;
    const { error: posterError } = await db.storage.from("banners").upload(posterPath, await readFile(poster), { contentType: "image/webp" });
    if (posterError) { await db.storage.from("banners").remove([videoPath]); throw posterError; }
    return Response.json({ src: db.storage.from("banners").getPublicUrl(videoPath).data.publicUrl, poster: db.storage.from("banners").getPublicUrl(posterPath).data.publicUrl });
  } catch (error) {
    console.error("Hero video processing failed", error);
    return Response.json({ error: "Video processing failed. Use a supported video under 30 MB and confirm MP4 uploads are enabled in the banners bucket." }, { status: 400 });
  } finally { if (directory) await rm(directory, { recursive: true, force: true }); }
}
