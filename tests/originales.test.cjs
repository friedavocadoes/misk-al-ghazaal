const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
      console,
      URL,
    },
  );
  return exports;
}
const config = load("src/features/originales/config.ts");
test("capsule membership uses actual lineup, not a coincidental title or slug", () => {
  assert.equal(config.isOriginales({ lineupSlug: "originales" }), true);
  assert.equal(
    config.isOriginales({
      title: "Originales Ambrato",
      slug: "originales-ambrato",
      lineupSlug: "another-lineup",
    }),
    false,
  );
  assert.equal(config.isOriginales({ title: "Originales" }), false);
  assert.equal(config.isOriginales({ lineupSlug: "ORIGINALES" }), true);
});
test("return paths retain safe browsing context but never external or private capabilities", () => {
  for (const p of [
    "/",
    "/ar/collection/all?lineup=maison",
    "/product/oud",
    "/pages/contact#visit",
  ])
    assert.equal(config.safeReturnPath(p), p);
  for (const p of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/admin/orders",
    "/ar/account/orders",
    "/orders/secret",
    "/preferences/secret",
    "/en/auth/callback",
    "/checkout",
    "/originales",
    "/ar/originales/originales-lustra",
    "/collection/all?lineup=originales",
    "/product/originales-lustra",
    "/x\nLocation:https://evil.test",
    null,
  ])
    assert.equal(config.safeReturnPath(p), null, String(p));
  assert.equal(
    config.isOriginalesPath("/ar/originales/originales-lustra"),
    true,
  );
  assert.equal(config.isOriginalesPath("/originales-lookalike"), false);
});
test("new editions fall back to their actual image and never borrow another fragrance identity", () => {
  const known = config.editionFor({
    slug: "originales-lazvaro",
    title: "Originales Lazvaro",
  });
  assert.equal(known.bottle, "/originales/lazvaro-bottle.webp");
  const future = config.editionFor({
    slug: "originales-fifth",
    title: "Originales Fifth",
  });
  assert.equal(future.name, "Fifth");
  assert.equal(future.bottle, null);
  assert.equal(future.box, null);
  assert.equal(
    config.originalesPath({ slug: "same live slug" }),
    "/originales/same%20live%20slug",
  );
});
test("gallery excludes unrelated products and preserves existing product identities/prices", async () => {
  const catalog = [
    { id: "other", lineupSlug: "other" },
    {
      id: "z",
      slug: "originales-lazvaro",
      lineupSlug: "originales",
      price: 123,
    },
    {
      id: "a",
      slug: "originales-ambrato",
      lineupSlug: "originales",
      price: 321,
    },
  ];
  const data = load("src/features/originales/data.ts", {
    "server-only": {},
    react: { cache: (fn) => fn },
    "@/lib/store": { getProducts: async () => catalog },
    "./config": config,
  });
  const result = await data.getOriginalesProducts();
  assert.deepEqual(
    Array.from(result, (p) => p.id),
    ["a", "z"],
  );
  assert.equal(result[0], catalog[2]);
  assert.equal(result[0].price, 321);
});
test("every shipped edition has transparent sources and optimized local artwork", async () => {
  const sharp = require("sharp");
  for (const name of Object.keys(config.EDITIONS)) {
    for (const part of ["bottle", "box"]) {
      const file = `public/originales/${name}-${part}.webp`,
        source = `public/originales/source/${name}-${part}.png`;
      const metadata = await sharp(file).metadata();
      assert.equal(metadata.hasAlpha, true);
      assert.ok(metadata.height <= 1100);
      assert.ok(fs.statSync(file).size < 500000);
      const stats = await sharp(source).stats();
      assert.ok(
        stats.channels[3].min === 0 && stats.channels[3].max >= 250,
        "real alpha coverage, not a checkerboard",
      );
    }
    assert.ok(
      fs.statSync(`public/originales/${name}-atmosphere.webp`).size < 500000,
    );
  }
});
test("product refresh invalidates the capsule and existing public/en/ar product paths together", () => {
  const calls = [];
  const revalidate = load("src/lib/revalidate.ts", {
    "next/cache": {
      revalidatePath: (path, type) => calls.push([path, type]),
      revalidateTag: () => {},
    },
    "@/features/originales/config": config,
  });
  revalidate.revalidateProductPaths("originales-ambrato");
  for (const prefix of ["", "/en", "/ar"]) {
    assert.ok(
      calls.some(([path]) => path === `${prefix}/product/originales-ambrato`),
    );
    assert.ok(
      calls.some(
        ([path]) => path === `${prefix}/originales/originales-ambrato`,
      ),
    );
  }
});
