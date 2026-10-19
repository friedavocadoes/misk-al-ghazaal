import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  try {
    if (Number(request.headers.get("content-length")) > 12 * 1024 * 1024) throw new Error("Image is too large.");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Use an image up to 10 MB.");
    const converted = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, animated: true })
      .rotate().webp({ lossless: true, effort: 4 }).toBuffer();
    return new Response(new Uint8Array(converted), { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unsupported image." }, { status: 400 });
  }
}
