const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");
const sharp = require("sharp");
const utility = () =>
  import(pathToFileURL(path.resolve("scripts/upload-note-glyphs.mjs")).href);
async function drawing() {
  return sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="1024" height="1024"><path fill="#30383a" d="M256 256H768V768H256Z"/></svg>',
        ),
      },
    ])
    .png()
    .toBuffer();
}
test("migration contains all requested names and protects the existing Apple record", async () => {
  const manifest = JSON.parse(
    await fs.readFile("docs/note-glyphs/manifest.json", "utf8"),
  );
  const sql = await fs.readFile(
    "supabase/migration_notes_expansion_20261106.sql",
    "utf8",
  );
  assert.equal(manifest.length, 37);
  assert.equal(manifest.filter((n) => !n.existing).length, 36);
  assert.deepEqual(
    manifest.filter((n) => n.existing).map((n) => n.slug),
    ["apple"],
  );
  assert.equal(new Set(manifest.map((n) => n.slug)).size, 37);
  assert(
    manifest
      .filter((n) => !n.existing)
      .every(
        (n) =>
          n.prompt.includes("transparent") && n.filename === n.slug + ".png",
      ),
  );
  for (const n of manifest)
    assert(sql.includes(`'${n.slug}', '${n.name.replaceAll("'", "''")}'`));
  assert.match(sql, /on conflict \(slug\) do nothing/i);
  assert.match(sql, /where not exists/i);
  assert.doesNotMatch(
    sql.replace(/--[^\n]*/g, ""),
    /\b(update|delete|drop)\b/i,
  );
});
test("conversion preserves transparency and solid stroke colour in lossless WebP", async () => {
  const { encodeGlyph } = await utility(),
    bytes = await encodeGlyph(await drawing()),
    meta = await sharp(bytes).metadata();
  assert.equal(meta.width, 512);
  assert.equal(meta.height, 512);
  assert.equal(meta.format, "webp");
  assert(meta.hasAlpha);
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0);
  assert.deepEqual(
    [
      ...data.subarray(
        (256 * info.width + 256) * 4,
        (256 * info.width + 256) * 4 + 4,
      ),
    ],
    [48, 56, 58, 255],
  );
});
test("opaque backgrounds and empty drawings are rejected", async () => {
  const { encodeGlyph } = await utility();
  for (const alpha of [0, 1]) {
    const bytes = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha },
      },
    })
      .png()
      .toBuffer();
    await assert.rejects(encodeGlyph(bytes), /opaque|empty/i);
  }
});
test("content paths are deterministic and reject unsafe slugs", async () => {
  const { glyphStoragePath } = await utility();
  assert.equal(
    glyphStoragePath("lemon", Buffer.from("a")),
    glyphStoragePath("lemon", Buffer.from("a")),
  );
  assert.notEqual(
    glyphStoragePath("lemon", Buffer.from("a")),
    glyphStoragePath("lemon", Buffer.from("b")),
  );
  assert.throws(
    () => glyphStoragePath("../lemon", Buffer.from("a")),
    /Invalid/,
  );
});
test("default CLI mode converts a partial batch locally without credentials or network writes", async () => {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), "gazaal-note-glyphs-test-"),
  );
  try {
    await fs.writeFile(path.join(dir, "lemon.png"), await drawing());
    await fs.writeFile(path.join(dir, "apple.png"), await drawing());
    const result = spawnSync(
      process.execPath,
      ["scripts/upload-note-glyphs.mjs", "--dir", dir],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1",
          SUPABASE_SECRET_KEY: "must-not-be-used-or-printed",
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No remote writes/);
    assert.match(result.stdout, /Ignored: apple.png/);
    assert.doesNotMatch(result.stdout, /must-not-be-used-or-printed/);
    assert.equal(
      (
        await sharp(
          await fs.readFile(path.join(dir, "webp/lemon.webp")),
        ).metadata()
      ).width,
      512,
    );
    await assert.rejects(fs.access(path.join(dir, "webp/apple.webp")));
  } finally {
    assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(dir).startsWith("gazaal-note-glyphs-test-"));
    await fs.rm(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
});
