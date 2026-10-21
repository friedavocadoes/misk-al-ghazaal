const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const ts = require("typescript");
const fs = require("node:fs");
function load(user, pricing) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("src/app/api/quote/route.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      Error,
      require: (n) =>
        n === "next/server"
          ? { NextResponse: Response }
          : n.includes("/supabase/server")
            ? {
                createClient: async () => ({
                  auth: { getUser: async () => ({ data: { user } }) },
                }),
              }
            : { quoteBag: pricing },
    },
  );
  return (body) =>
    exports.POST(
      new Request("http://localhost/api/quote", {
        method: "POST",
        body: JSON.stringify({ lines: [{ slug: "oud", qty: 1 }], ...body }),
      }),
    );
}
const quote = { subtotal: 100, total: 126, couponCode: "", referralCode: "" };
test("guest saved coupon does not blank merchandise totals", async () => {
  const run = load(null, async (input) => {
    assert.equal(input.couponCode, "");
    return { quote };
  });
  const r = await run({ couponCode: "OLD" });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.couponError, "coupon:login");
  assert.equal(d.quote.subtotal, 100);
});
test("invalid coupon and referral recover independently", async () => {
  const run = load({ id: "u" }, async (input) => {
    if (input.couponCode) throw Error("coupon:used");
    if (input.referralCode) throw Error("referral:repeat");
    return { quote };
  });
  const d = await (
    await run({ couponCode: "OLD", referralCode: "OLD" })
  ).json();
  assert.equal(d.couponError, "coupon:used");
  assert.equal(d.referralError, "referral:repeat");
  assert.equal(d.quote.total, 126);
});
test("stock failure remains an error rather than a fabricated price", async () => {
  const run = load(null, async () => {
    throw Error("Out of stock: Oud");
  });
  const r = await run({});
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /Out of stock/);
});
