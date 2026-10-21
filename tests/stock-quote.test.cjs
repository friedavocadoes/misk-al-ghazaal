const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function pricing(stock = 0) {
  const exports = {};
  const db = {
    from: (table) => {
      const q = {
        select: () => q,
        in: () => q,
        is: () => q,
        then: (resolve) =>
          Promise.resolve({
            data:
              table === "products"
                ? [{ id: "p", slug: "oud", title: "Oud", price: 100 }]
                : [
                    {
                      id: "v",
                      product_id: "p",
                      title: "50ml",
                      price: 100,
                      stock,
                    },
                  ],
          }).then(resolve),
      };
      return q;
    },
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/lib/pricing.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      Error,
      require: (n) =>
        n === "./supabase/service"
          ? { createAdminClient: () => db }
          : { FREE_SHIP_THRESHOLD: 200, FLAT_SHIPPING: 26 },
    },
  );
  return exports;
}
const lines = [{ slug: "oud", variantId: "v", qty: 1 }];
test("sold-out cart still shows real totals and an actionable stock issue in preview", async () => {
  const r = await pricing().quoteBag({ lines, previewStock: true });
  assert.equal(r.quote.subtotal, 100);
  assert.equal(r.stockIssues[0].available, 0);
  assert.equal(r.stockIssues[0].slug, "oud");
});
test("same sold-out cart remains blocked at order placement", async () => {
  await assert.rejects(pricing().quoteBag({ lines }), /Out of stock/);
});
test("quantity increase above stock provides exact available quantity", async () => {
  const r = await pricing(2).quoteBag({
    lines: [{ ...lines[0], qty: 3 }],
    previewStock: true,
  });
  assert.equal(r.quote.subtotal, 300);
  assert.equal(r.stockIssues[0].available, 2);
  assert.equal(r.stockIssues[0].requested, 3);
});
test("in-stock order has no stock issues", async () => {
  const r = await pricing(2).quoteBag({ lines });
  assert.equal(r.stockIssues.length, 0);
});
