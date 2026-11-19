const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function route({ role = "super_admin", size = 6 * 1024 * 1024, failProcessing = false } = {}) {
  const calls = [];
  const path = "hero-source/staff/00000000-0000-4000-8000-000000000001";
  const storage = {
    createSignedUploadUrl: async (source) => {
      calls.push(["sign", source]);
      return { data: { signedUrl: "https://storage.example/upload?token=test" } };
    },
    info: async () => ({ data: { size, contentType: "video/mp4" } }),
    download: async () => {
      calls.push(["download"]);
      return { data: new Blob([new Uint8Array(size)], { type: "video/mp4" }) };
    },
    upload: async (destination) => { calls.push(["upload", destination]); return {}; },
    remove: async (paths) => { calls.push(["remove", paths]); return {}; },
    getPublicUrl: (destination) => ({ data: { publicUrl: "https://storage.example/" + destination } }),
  };
  const mocks = {
    "@/lib/admin-auth": { getAdminSession: async () => role && ({ role, userId: "staff" }) },
    "@/lib/supabase/server": { createClient: async () => ({ storage: { from: () => storage } }) },
    "node:fs/promises": {
      mkdtemp: async () => "temp-video",
      writeFile: async () => {},
      readFile: async () => Buffer.from("converted media"),
      rm: async () => {},
    },
    "node:util": { promisify: () => async () => { if (failProcessing) throw Error("Processing failed"); } },
    "ffmpeg-static": "ffmpeg",
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/app/api/admin/hero-video/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, {
    module, exports: module.exports, require: (name) => mocks[name] || require(name),
    Request, Response, Blob, File, Buffer, crypto: require("node:crypto").webcrypto,
    console: { error() {} },
  });
  const post = (body) => module.exports.POST(new Request("https://shop.example/api/admin/hero-video", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  return { post, calls, path };
}

test("6 MB sources use a signed storage upload and a small JSON processing request", async () => {
  const { post, calls, path } = route();
  const prepared = await post({ action: "prepare", contentType: "video/mp4", size: 6 * 1024 * 1024 });
  assert.equal(prepared.status, 200);
  assert.match((await prepared.json()).sourcePath, /^hero-source\/staff\/[0-9a-f-]{36}$/);
  const processed = await post({ sourcePath: path, device: "mobile" });
  assert.equal(processed.status, 200);
  const artwork = await processed.json();
  assert.match(artwork.src, /hero-video\/.+\.mp4$/);
  assert.match(artwork.poster, /hero-video\/.+\.webp$/);
  assert.equal(calls.filter(([action]) => action === "upload").length, 2);
  assert(calls.some(([action, paths]) => action === "remove" && paths[0] === path));
});

test("unauthorized callers and foreign source paths cannot access uploaded videos", async () => {
  for (const role of [null, "orders", "content_editor"]) {
    const { post, calls } = route({ role });
    assert.equal((await post({ action: "prepare", size: 10, contentType: "video/mp4" })).status, 403);
    assert.equal(calls.length, 0);
  }
  const { post, calls } = route();
  assert.equal((await post({ sourcePath: "hero-source/other/00000000-0000-4000-8000-000000000001" })).status, 400);
  assert.equal((await post({ sourcePath: "https://example.com/video.mp4" })).status, 400);
  assert.equal(calls.length, 0);
});

test("oversize stored sources are refused before download and removed", async () => {
  const { post, calls, path } = route({ size: 31 * 1024 * 1024 });
  assert.equal((await post({ sourcePath: path })).status, 400);
  assert(!calls.some(([action]) => action === "download"));
  assert(calls.some(([action]) => action === "remove"));
});

test("failed video processing cleans the temporary source", async () => {
  const { post, calls, path } = route({ failProcessing: true });
  assert.equal((await post({ sourcePath: path })).status, 400);
  assert(calls.some(([action, paths]) => action === "remove" && paths[0] === path));
  assert(!calls.some(([action]) => action === "upload"));
});
