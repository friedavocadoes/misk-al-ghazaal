/** Local owner utility. Preview only unless --apply is supplied. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";
const root = fileURLToPath(new URL("../", import.meta.url));

export async function encodeGlyph(input) {
  const image = sharp(input, { limitInputPixels: 16777216 }),
    metadata = await image.metadata();
  if (!metadata.hasAlpha || (metadata.pages ?? 1) > 1)
    throw Error("Use a still image with genuine alpha transparency.");
  const stats = await image.clone().ensureAlpha().stats(),
    alpha = stats.channels.at(-1);
  if (alpha.min === 255 || alpha.max === 0)
    throw Error(
      "Image is opaque or empty. A checkerboard picture is not transparency.",
    );
  return image
    .rotate()
    .toColourspace("srgb")
    .resize({
      width: 512,
      height: 512,
      fit: "contain",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ lossless: true, alphaQuality: 100, effort: 6 })
    .toBuffer();
}
export function glyphStoragePath(slug, bytes) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw Error("Invalid glyph slug");
  return `note-glyphs/bulk-20261106/${slug}-${createHash("sha256").update(bytes).digest("hex").slice(0, 32)}.webp`;
}
export async function main(args = process.argv.slice(2)) {
  const allowed = new Set([
    "--dir",
    "--apply",
    "--dry-run",
    "--replace",
    "--help",
  ]);
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw Error(`Unknown option: ${args[i]}`);
    if (args[i] === "--dir") i++;
  }
  const at = args.indexOf("--dir");
  if (args.includes("--help") || at < 0 || !args[at + 1]) {
    console.log(
      'Usage: node scripts/upload-note-glyphs.mjs --dir "C:/path/to/glyphs" [--apply] [--replace]\nDefault: local preview/conversion only. --apply uploads and links images; --replace permits replacing custom artwork.',
    );
    return;
  }
  if (args.includes("--apply") && args.includes("--dry-run"))
    throw Error("Choose --apply or --dry-run, not both.");
  const apply = args.includes("--apply"),
    replace = args.includes("--replace"),
    dir = path.resolve(args[at + 1]);
  const manifest = JSON.parse(
    await fs.readFile(
      path.join(root, "docs/note-glyphs/manifest.json"),
      "utf8",
    ),
  );
  const permitted = new Set(
      manifest.filter((n) => !n.existing).map((n) => n.slug),
    ),
    inputs = new Map();
  for (const f of await fs.readdir(dir, { withFileTypes: true })) {
    if (!f.isFile() || !/\.(png|webp|avif)$/i.test(f.name)) continue;
    const slug = path.parse(f.name).name.toLowerCase();
    if (!permitted.has(slug)) {
      console.log(`Ignored: ${f.name} (not a new-note slug)`);
      continue;
    }
    if (inputs.has(slug))
      throw Error(`Multiple input images for ${slug}. Keep one file per note.`);
    inputs.set(slug, path.join(dir, f.name));
  }
  if (!inputs.size)
    throw Error(
      "No matching files. Use filenames from docs/note-glyphs/prompts.md.",
    );
  const prepared = [];
  // Validate the complete local batch before any network write; partial sets are supported.
  for (const [slug, file] of inputs) {
    if ((await fs.stat(file)).size > 20 * 1024 * 1024)
      throw Error(`${slug}: input exceeds 20 MB.`);
    const bytes = await encodeGlyph(file).catch((e) => {
      throw Error(`${slug}: ${e.message}`);
    });
    prepared.push({ slug, bytes, storagePath: glyphStoragePath(slug, bytes) });
  }
  let db, notes;
  if (apply) {
    for (const name of [".env.local", ".env"]) {
      try {
        process.loadEnvFile(path.join(root, name));
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const secret =
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret)
      throw Error(
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in local .env. Never expose the secret in NEXT_PUBLIC_ variables.",
      );
    const { createClient } = await import("@supabase/supabase-js");
    db = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await db
      .from("notes")
      .select("id,slug,glyph")
      .in(
        "slug",
        prepared.map((n) => n.slug),
      );
    if (result.error) throw Error(result.error.message);
    notes = new Map(result.data.map((n) => [n.slug, n]));
    const absent = prepared.filter((n) => !notes.has(n.slug));
    if (absent.length)
      throw Error(
        `Run the SQL migration first. Missing: ${absent.map((n) => n.slug).join(", ")}`,
      );
  }
  const output = path.join(dir, "webp"),
    report = [];
  await fs.mkdir(output, { recursive: true });
  for (const item of prepared) {
    await fs.writeFile(path.join(output, `${item.slug}.webp`), item.bytes);
    if (!apply) {
      console.log(
        `PREVIEW ${item.slug}: ${(item.bytes.length / 1024).toFixed(1)} KB lossless WebP → ${item.storagePath}`,
      );
      continue;
    }
    const note = notes.get(item.slug),
      target = db.storage.from("products").getPublicUrl(item.storagePath)
        .data.publicUrl;
    if (note.glyph === target) {
      console.log(`Already linked: ${item.slug}`);
      continue;
    }
    if (
      note.glyph &&
      !["/notes/essence.svg", "droplet", ""].includes(note.glyph) &&
      !replace
    ) {
      console.log(
        `Preserved existing artwork: ${item.slug} (use --replace to change)`,
      );
      continue;
    }
    try {
      const uploaded = await db.storage
        .from("products")
        .upload(item.storagePath, item.bytes, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "31536000",
        });
      if (uploaded.error) throw Error(uploaded.error.message);
      let update = db.from("notes").update({ glyph: target }).eq("id", note.id);
      update =
        note.glyph === null
          ? update.is("glyph", null)
          : update.eq("glyph", note.glyph);
      const saved = await update.select("id");
      if (saved.error) throw Error(saved.error.message);
      if (!saved.data.length)
        throw Error(
          "Artwork changed during upload; the newer edit was preserved.",
        );
      report.push({
        slug: item.slug,
        noteId: note.id,
        previousGlyph: note.glyph,
        glyph: target,
      });
      console.log(`Linked: ${item.slug}`);
    } catch (e) {
      report.push({ slug: item.slug, error: e.message });
      console.error(`FAILED ${item.slug}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  if (apply) {
    await fs.writeFile(
      path.join(output, `upload-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2),
    );
    console.log(
      "Open Admin → Notes → Refresh storefront to publish changes to cached pages. Previous artwork files were retained; the local report records rollback URLs.",
    );
  } else
    console.log(
      `No remote writes. ${prepared.length} glyphs prepared in ${output}. Add --apply when ready.`,
    );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
