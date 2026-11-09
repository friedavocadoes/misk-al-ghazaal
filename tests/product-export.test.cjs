const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  ts = require("typescript"),
  ExcelJS = require("exceljs");
function load(file, resolve) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)(
    resolve,
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const config = load("src/features/originales/config.ts", require);
const { productWorkbook } = load("src/lib/product-export.ts", (name) =>
  name === "@/features/originales/config" ? config : require(name),
);
const products = [
  {
    id: "1",
    title: "=2+2",
    slug: "amber",
    is_active: true,
    lineups: null,
    product_notes: [
      { kind: "top", position: 1, notes: { name: "Bergamot" } },
      { kind: "top", position: 0, notes: { name: "Lemon" } },
      { kind: "heart", position: 0, notes: { name: "Rose" } },
      { kind: "base", position: 0, notes: { name: "Oud" } },
    ],
  },
  {
    id: "2",
    title: "Lazvaro",
    slug: "originales-lazvaro",
    is_active: false,
    lineups: { slug: "originales" },
    product_notes: [],
  },
];
for (const origin of ["http://localhost:3000", "https://preview.example.com"])
  test(`Excel round trip preserves sheets, notes and full links for ${origin}`, async () => {
    const data = await productWorkbook(products, origin),
      book = new ExcelJS.Workbook();
    await book.xlsx.load(data);
    assert.deepEqual(
      book.worksheets.map((s) => s.name),
      ["Enabled products", "Disabled products"],
    );
    const enabled = book.worksheets[0],
      disabled = book.worksheets[1];
    assert.equal(enabled.rowCount, 2);
    assert.equal(disabled.rowCount, 2);
    assert.equal(enabled.getCell("A2").value, "=2+2");
    assert.equal(enabled.getCell("A2").type, ExcelJS.ValueType.String);
    assert.equal(enabled.getCell("B2").hyperlink, origin + "/product/amber");
    assert.equal(
      disabled.getCell("B2").hyperlink,
      origin + "/originales/originales-lazvaro",
    );
    assert.equal(enabled.getCell("C2").value, "Lemon, Bergamot");
    assert.equal(enabled.getCell("D2").value, "Rose");
    assert.equal(enabled.getCell("E2").value, "Oud");
    assert.equal(enabled.views[0].ySplit, 1);
  });
test("empty catalog still has both usable header sheets", async () => {
  const b = new ExcelJS.Workbook();
  await b.xlsx.load(await productWorkbook([], "http://localhost:3000"));
  assert(b.worksheets.every((s) => s.rowCount === 1));
});
test("export endpoint rejects customers and anonymous requests before reading products", async () => {
  for (const session of [null, { role: "customer" }]) {
    const { GET } = load(
      "src/app/api/admin/products/export/route.ts",
      (name) =>
        name === "@/lib/admin-auth"
          ? { getAdminSession: async () => session }
          : name === "@/lib/supabase/server"
            ? {
                createClient: () => {
                  throw Error("Database must not be read");
                },
              }
            : { productWorkbook },
    );
    const r = await GET(
      new Request("http://localhost:3000/api/admin/products/export"),
    );
    assert.equal(r.status, session ? 403 : 401);
  }
});
test("export paginates all products and uses the browser origin behind a proxy", async () => {
  const pages = [];
  let captured;
  const query = {
    select() {
      return query;
    },
    is(field, value) {
      assert.equal(field, "deleted_at");
      assert.equal(value, null);
      return query;
    },
    order() {
      return query;
    },
    range(start, end) {
      pages.push([start, end]);
      return Promise.resolve({
        data: Array.from({ length: start === 0 ? 500 : 1 }, (_, i) => ({
          id: String(start + i),
        })),
        error: null,
      });
    },
  };
  const { GET } = load("src/app/api/admin/products/export/route.ts", (name) =>
    name === "@/lib/admin-auth"
      ? { getAdminSession: async () => ({ role: "super_admin" }) }
      : name === "@/lib/supabase/server"
        ? { createClient: async () => ({ from: () => query }) }
        : name === "@/lib/audit"
          ? { logAdmin: async () => {} }
          : {
              productWorkbook: async (rows, origin) => {
                captured = { count: rows.length, origin };
                return new Uint8Array([80, 75]);
              },
            },
  );
  const response = await GET(
    new Request("http://internal:3000/api/admin/products/export", {
      headers: {
        referer: "https://shop.example.com/admin/products?status=disabled",
      },
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(pages, [
    [0, 499],
    [500, 999],
  ]);
  assert.deepEqual(captured, {
    count: 501,
    origin: "https://shop.example.com",
  });
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});
