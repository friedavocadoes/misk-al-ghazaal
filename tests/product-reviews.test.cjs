const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

function load({ profiles = [], orders = [], failMetadata = false } = {}) {
  const calls = [];
  const review = { id: "review", product_id: "product", user_id: "author", rating: 5,
    title: "Beautiful", body: "Lasts all day", approved: true, created_at: "2026-10-20T10:00:00Z" };
  function query(table, result) {
    const q = { then: (resolve) => Promise.resolve(result).then(resolve) };
    for (const method of ["select", "eq", "in", "order", "limit", "maybeSingle"]) {
      q[method] = (...args) => { calls.push([table, method, ...args]); return q; };
    }
    return q;
  }
  const publicDb = { from: table => query(table, { data: [review], error: null }) };
  const admin = { from: table => query(table, { data:
    table === "profiles" ? profiles : table === "products" ? { slug: "perfume" } : orders }) };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync("src/lib/product-reviews.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (name === "server-only") return {};
    if (name === "./supabase/public") return { createPublicClient: () => publicDb };
    if (name === "./supabase/service") return { createAdminClient: () => {
      if (failMetadata) throw Error("Metadata unavailable");
      return admin;
    } };
    throw Error(name);
  } });
  return { read: exports.readApprovedReviews, calls };
}

test("approved reviews do not join protected profiles, and metadata failure keeps them visible", async () => {
  const { read, calls } = load({ failMetadata: true });
  const result = await read("product", 20);
  assert.equal(result.length, 1);
  assert.equal(result[0].body, "Lasts all day");
  assert(calls.some(c => c[0] === "reviews" && c[1] === "eq" && c[2] === "approved" && c[3] === true));
  assert(!calls.find(c => c[0] === "reviews" && c[1] === "select")[2].includes("profiles"));
});

test("only public identity and a qualifying purchase date reach the review model", async () => {
  const { read, calls } = load({
    profiles: [{ id: "author", full_name: "A Reader", avatar_url: "https://example.com/photo.webp", email: "private@example.com" }],
    orders: [{ user_id: "author", created_at: "2026-09-01T00:00:00Z", address: "private address" }],
  });
  const [review] = await read("product", 20);
  assert.equal(review.authorName, "A Reader");
  assert.equal(review.authorAvatar, "https://example.com/photo.webp");
  assert.equal(review.purchasedAt, "2026-09-01T00:00:00Z");
  assert(!JSON.stringify(review).includes("private"));
  assert(calls.some(c => c[0] === "orders" && c[2] === "status" && c[3] === "delivered"));
  assert(calls.some(c => c[0] === "orders" && c[2] === "order_items.product_slug" && c[3] === "perfume"));
});

test("later purchases and other customers' orders do not verify a review", async () => {
  const { read } = load({ orders: [
    { user_id: "other", created_at: "2026-09-01T00:00:00Z" },
    { user_id: "author", created_at: "2026-10-21T00:00:00Z" },
  ] });
  assert.equal((await read("product", 20))[0].purchasedAt, undefined);
});
