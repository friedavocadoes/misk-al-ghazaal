function loadSavings(){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/coupon-savings.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});return exports;}
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function pricing(stock = 0, productExtra={}, variantExtra={}) {
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
                ? [{ id: "p", slug: "oud", title: "Oud", price: 100,...productExtra }]
                : [
                    {
                      id: "v",
                      product_id: "p",
                      title: "50ml",
                      price: 100,
                      stock,...variantExtra,
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
        n === "./coupon-savings" ? loadSavings() : n === "./supabase/service"
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

test("manual out-of-stock and archived options cannot be ordered despite positive inventory",async()=>{
 for(const engine of [pricing(10,{out_of_stock:true}),pricing(10,{}, {is_active:false})]){
  const preview=await engine.quoteBag({lines,previewStock:true});assert.equal(preview.stockIssues[0].available,0);
  await assert.rejects(engine.quoteBag({lines}),/Out of stock/);
 }
});
test("legacy lines without variant IDs still validate stock and resolve a real option",async()=>{
 const input={lines:[{slug:"oud",qty:1}]};
 await assert.rejects(pricing(0).quoteBag(input),/Out of stock/);
 const result=await pricing(5).quoteBag(input);assert.equal(result.priced[0].variantId,"v");
});
