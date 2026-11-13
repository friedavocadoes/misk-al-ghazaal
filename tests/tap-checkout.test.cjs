const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { createHmac } = require("node:crypto");

function load(file, mocks = {}, env = {}, globals = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports, require: name => name in mocks ? mocks[name] : require(name),
    URL, Buffer, AbortSignal, process: { env }, ...globals,
  });
  return exports;
}

const eligibility = load("src/lib/checkout-payment.ts", {
  "./dial-codes": load("src/lib/dial-codes.ts"),
  "./whatsapp-shared": load("src/lib/whatsapp-shared.ts"),
});
const tapEnv = {
  TAP_SECRET_KEY: "sk_test_fixture", TAP_MERCHANT_ID: "12345678", TAP_SITE_URL: "https://store.example",
  TAP_PAYMENT_METHODS: "card,apple_pay,tabby,tamara", TAP_TAMARA_MIN_AED: "50", TAP_TAMARA_MAX_AED: "1000",
};
const loadTap = (env, globals) => load("src/lib/tap.ts", { "server-only": {}, "./checkout-payment": eligibility }, env, globals);

test("merchant configuration and the final AED total determine selectable methods", () => {
  const { paymentRestriction: reason } = eligibility;
  const { methods } = loadTap(tapEnv).tapConfig();
  const mobile = "+971 501234567";
  assert.equal(reason("card", methods.card, 0, "AE", mobile), "minimum");
  assert.equal(reason("card", methods.card, 0.1, "AE", "+44 7890123456"), undefined);
  assert.equal(reason("apple_pay", methods.apple_pay, 100, "AE", mobile, false), "apple");
  assert.equal(reason("tabby", methods.tabby, 9.99, "AE", mobile), "minimum");
  assert.equal(reason("tabby", methods.tabby, 10, "AE", mobile), undefined);
  assert.equal(reason("tabby", methods.tabby, 100, "SA", mobile), "uae");
  assert.equal(reason("tabby", methods.tabby, 100, "AE", "+971 42123456"), "mobile");
  assert.equal(reason("tamara", methods.tamara, 1000.01, "AE", mobile), "maximum");
  assert.equal(loadTap({ ...tapEnv, TAP_TAMARA_MIN_AED: "" }).tapConfig().methods.tamara, undefined);
  assert.equal(loadTap({ ...tapEnv, TAP_TABBY_MIN_AED: "1" }).tapConfig().methods.tabby.min, 10);
  assert.equal(loadTap({ ...tapEnv, VERCEL_ENV: "production" }).tapConfig(), null);
  const sandbox = loadTap({ ...tapEnv, VERCEL_ENV: "production", TAP_STAFF_SANDBOX: "1" }).tapConfig();
  assert.equal(sandbox.live, false);
  assert.equal(sandbox.staffSandbox, true);
  assert.equal(sandbox.merchantScope, "sandbox:12345678");
  const shared = { ...tapEnv, TAP_MERCHANT_ID: "599424", VERCEL_ENV: "production" };
  assert.equal(loadTap(shared).tapConfig().staffSandbox, true);
  assert.equal(loadTap({ ...shared, TAP_SECRET_KEY: "sk_live_fixture" }).tapConfig(), null);
  assert.equal(loadTap({ ...tapEnv, TAP_MERCHANT_ID: "pk_test_fixture" }).tapConfig(), null);
});

test("Tap receives the selected source and a stable attempt reference, and signs AED with two decimals", async () => {
  const calls = [];
  const tap = loadTap(tapEnv, { fetch: async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ id: "chg_TEST" }) };
  } });
  const config = tap.tapConfig();
  const id = "00000000-0000-4000-8000-000000000001";
  for (const method of eligibility.TAP_METHODS) {
    await tap.createTapCharge(config, { id, method, amount: 100.5, locale: "ar", customer: {
      first_name: "Test", phone: { country_code: "971", number: "501234567" },
    } });
  }
  assert.deepEqual(calls.map(call => call.body.source.id), ["src_card", "src_apple_pay", "src_tabby.installement", "src_tamara"]);
  assert.deepEqual(calls[0].body.reference, { order: id, transaction: id, idempotent: id });
  assert.equal(calls[0].body.currency, "AED");
  assert.deepEqual(calls[0].body.merchant, { id: "12345678" });
  assert.equal(calls[0].options.headers.lang_code, "ar");
  assert.equal(calls[0].body.redirect.url, `https://store.example/ar/checkout/payment?attempt=${id}`);
  assert.equal(calls[0].body.post.url, "https://store.example/api/checkout/payment/webhook");
  assert.equal(tap.tapPaymentUrl("https://acceptance.sandbox.tap.company/pay"), "https://acceptance.sandbox.tap.company/pay");
  assert.equal(tap.tapPaymentUrl("https://checkout.tabby.ai/pay", "tabby"), "https://checkout.tabby.ai/pay");
  assert.equal(tap.tapPaymentUrl("https://checkout.tabby.ai/pay", "card"), undefined);
  assert.equal(tap.tapPaymentUrl("https://tap.company.evil.test/pay"), undefined);

  const payload = { id: "chg_TEST", object: "charge", amount: 100.5, currency: "AED", status: "CAPTURED",
    transaction: { created: "1698392202943" }, reference: { payment: "12345", gateway: null } };
  const signature = createHmac("sha256", config.secret)
    .update("x_idchg_TESTx_amount100.50x_currencyAEDx_gateway_referencex_payment_reference12345x_statusCAPTUREDx_created1698392202943").digest("hex");
  assert.equal(tap.verifyTapWebhook(payload, signature, config.secret), true);
  assert.equal(tap.verifyTapWebhook({ ...payload, amount: 101 }, signature, config.secret), false);
  assert.equal(tap.verifyTapWebhook(payload, "bad-signature", config.secret), false);
});

test("a merchant-scoped secret key can create a charge without a Merchant ID", async () => {
  const env = { ...tapEnv, TAP_MERCHANT_ID: "" };
  let request;
  const tap = loadTap(env, { fetch: async (_url, options) => {
    request = options;
    return { ok: true, json: async () => ({ id: "chg_TEST" }) };
  } });
  const config = tap.tapConfig();
  assert.equal(config.methods.card.min, 0.1);
  assert.notEqual(config.merchantScope, loadTap({ ...env, TAP_SECRET_KEY: "sk_test_other" }).tapConfig().merchantScope);
  await tap.createTapCharge(config, {
    id: "00000000-0000-4000-8000-000000000001", method: "card", amount: 100, locale: "en",
    customer: { first_name: "Test", phone: { country_code: "971", number: "501234567" } },
  });
  assert.equal(request.headers.Authorization, "Bearer sk_test_fixture");
  assert.equal(Object.hasOwn(JSON.parse(request.body), "merchant"), false);
});

test("the deployed sandbox exposes payment options and results only to the initiating staff account", async () => {
  const config = loadTap({ ...tapEnv, VERCEL_ENV: "production", TAP_STAFF_SANDBOX: "1" }).tapConfig();
  let staff = null;
  let reads = 0;
  let changed = false;
  let providerFails = false;
  let owner = "staff-1";
  const options = load("src/app/api/checkout/payment/options/route.ts", {
    "@/lib/tap": { tapConfig: () => config },
    "@/lib/admin-auth": { getAdminSession: async () => staff },
    "@/lib/supabase/service": { createAdminClient: () => ({ from: () => ({ select: column => ({ limit: async () => {
      assert.equal(column, "sandbox_staff_id"); reads++; return { error: null };
    } }) }) }) },
  }, {}, { Response });
  assert.deepEqual(await (await options.GET()).json(), { methods: {} });
  assert.equal(reads, 0);
  staff = { userId: "staff-1" };
  assert.equal((await (await options.GET()).json()).sandbox, true);

  const status = load("src/app/api/checkout/payment/status/route.ts", {
    "@/lib/tap": { tapConfig: () => config, validChargeId: () => false },
    "@/lib/admin-auth": { getAdminSession: async () => staff },
    "@/lib/checkout-tap": {
      checkoutPaymentProof: () => ({ id: "test" }),
      findCheckoutAttempt: async () => ({ sandbox_staff_id: owner, order_data: { total: 100 } }),
      sandboxConfigChanged: () => changed,
      continueCheckoutPayment: async () => {
        if (providerFails) throw new Error("Tap unavailable");
        return { state: "paid", charge_id: "chg_TEST" };
      },
      checkoutPaymentReceipt: () => assert.fail("Sandbox must not create a real receipt"),
    },
  }, {}, { Response, console: { warn() {} } });
  const check = (body = {}, origin = config.origin) => status.POST(new Request("https://store.example/api/checkout/payment/status", {
    method: "POST", headers: { origin }, body: JSON.stringify(body),
  }));
  staff = null;
  assert.equal((await check()).status, 403);
  staff = { userId: "staff-2" };
  assert.equal((await check()).status, 403);
  assert.equal((await check({ restart: true })).status, 403);
  staff = { userId: "staff-1" };
  assert.equal((await check({ restart: true }, "https://other.example")).status, 403);
  assert.deepEqual(await (await check()).json(), { state: "sandbox_paid", total: 100, chargeId: "chg_TEST" });
  providerFails = true;
  const retry = await check();
  assert.equal(retry.status, 503);
  assert.deepEqual(await retry.json(), { state: "retry", canRestartSandbox: true, hasCharge: false });
  assert.deepEqual(await (await check({ restart: true })).json(), { state: "sandbox_restart" });
  changed = true;
  assert.deepEqual(await (await check()).json(), { state: "sandbox_reconfigured" });
  owner = null;
  assert.equal((await check({ restart: true })).status, 409);
});

test("Tap reconciliation uses the retrieved charge and rejects a wrong amount, currency, reference or mode", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const config = loadTap(tapEnv).tapConfig();
  const attempt = {
    id, state: "pending", method: "card", merchant_id: config.merchant, live_mode: false, origin: config.origin,
    charge_id: "chg_TEST", order_data: { total: 100.5 }, lines: [], context: {},
  };
  const charge = {
    id: "chg_TEST", status: "CAPTURED", amount: 100.5, currency: "AED", live_mode: false,
    reference: { order: id, transaction: id }, merchant: { id: config.merchant },
  };
  let retrieved = charge;
  const updates = [];
  const service = load("src/lib/checkout-tap.ts", {
    "server-only": {}, "next/server": { after() {} },
    "./supabase/server": {}, "./analytics/server": {}, "./checkout-effects": {}, "./order-access": {}, "./telegram": {},
    "./checkout-payment": eligibility,
    "./tap": { ...loadTap(tapEnv), retrieveTapCharge: async (_config, chargeId) => {
      assert.equal(chargeId, "chg_TEST");
      return retrieved;
    } },
    "./supabase/service": { createAdminClient: () => ({ rpc: async (_name, params) => {
      updates.push(params.p_state);
      return { data: { state: params.p_state, order_id: params.p_state === "paid" ? "order-id" : null, created: false } };
    } }) },
  });
  for (const wrong of [{ amount: 10 }, { currency: "USD" }, { live_mode: true }, { reference: { order: "wrong" } }]) {
    retrieved = { ...charge, ...wrong };
    await assert.rejects(service.continueCheckoutPayment(attempt, config), /does not match/);
  }
  assert.deepEqual(updates, []);
  retrieved = charge;
  const result = await service.continueCheckoutPayment(attempt, config);
  assert.deepEqual(updates, ["pending", "paid"]);
  assert.equal(result.order_id, "order-id");
});

test("actual SQL: stock and coupon holds, single paid order on retry, failure release, and COD", { skip: !process.env.ANALYTICS_PGLITE_MODULE }, async () => {
  const { PGlite } = require(process.env.ANALYTICS_PGLITE_MODULE);
  const db = new PGlite();
  const id = n => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table profiles(id uuid primary key, role text default 'customer');
      create table products(id uuid primary key, slug text unique, price numeric, deleted_at timestamptz,
        is_active bool default true, out_of_stock bool default false, sales_count int default 0);
      create table variants(id uuid primary key, product_id uuid references products(id), price numeric, stock int, is_active bool default true);
      create table orders(id uuid primary key default gen_random_uuid(), order_no text, customer_name text,
        phone text, email text, address text, city text, emirate text, notes text, subtotal numeric, shipping numeric, discount numeric, total numeric,
        coupon_code text, referral_code text, user_id uuid, country_code text, state_name text, postcode text, address_label text,
        delivery_lat numeric, delivery_lng numeric, whatsapp_opt_in bool, checkout_terms_version text, payment_method text, payment_status text,
        sample_ids uuid[] default '{}', status text default 'new', deleted_at timestamptz);
      create table order_items(order_id uuid references orders(id), product_slug text, variant_id uuid, title text, qty int, unit_price numeric);
      create table order_status_history(order_id uuid references orders(id), to_status text);
      create table coupons(id uuid primary key, code text unique, owner_id uuid, usage_limit int, used_count int default 0, first_order_only bool default false);
      create table coupon_redemptions(coupon_id uuid references coupons(id), order_id uuid references orders(id), user_id uuid);
      create table samples(id uuid primary key, name text, stock int, active bool default true);
      create table sample_tiers(min_subtotal numeric, allowance int);
      create table staff_alerts(order_id uuid unique references orders(id));
      create function staff_alert() returns trigger language plpgsql as $$begin insert into staff_alerts values(new.id); return new; end$$;
      create trigger staff_alert after insert on orders for each row execute function staff_alert();
    `);
    const sql = fs.readFileSync("supabase/migration_tap_checkout.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    const sandboxSql = fs.readFileSync("supabase/migration_tap_staff_sandbox.sql", "utf8");
    await db.exec(sandboxSql);
    await db.exec(sandboxSql);
    await db.exec("create trigger reserve_order_coupon after insert on orders for each row execute function reserve_order_coupon()");
    await db.query("insert into products(id,slug,price) values($1,'oud',100)", [id(1)]);
    await db.query("insert into variants(id,product_id,price,stock) values($1,$2,100,2)", [id(2), id(1)]);
    await db.query("insert into samples values($1,'Rose',2,true)", [id(3)]);
    await db.query("insert into coupons(id,code,owner_id,usage_limit) values($1,'SAVE',$2,1)", [id(4), id(5)]);
    await db.query("insert into profiles values($1)", [id(5)]);
    await db.query("insert into profiles values($1,'orders')", [id(8)]);
    await db.exec("insert into sample_tiers values(100,1)");

    const order = { customer_name: "Test", user_id: id(5), email: "test@example.test", referral_code: "FRIEND", subtotal: 100, total: 95, coupon_code: "SAVE",
      sample_ids: [id(3)], payment_method: "card" };
    const line = { slug: "oud", variantId: id(2), title: "Oud", qty: 1, unit: 100 };
    const begin = (n, key = "key", draft = order) => db.query(
      "select (tap_checkout_begin($1,$2,'card','1',false,'https://store.example','en',$3,$4,'{}')).id",
      [id(n), key, JSON.stringify(draft), JSON.stringify([line])]);
    const update = async (n, charge, state) => (await db.query("select tap_checkout_update($1,$2,$3) as value", [id(n), charge, state])).rows[0].value;
    const count = async table => (await db.query(`select count(*)::int as n from ${table}`)).rows[0].n;
    const stock = async table => (await db.query(`select stock from ${table}`)).rows[0].stock;

    const sandbox = staff => db.query(
      "select (tap_checkout_begin_sandbox($1,'proof','card','sandbox:1','https://store.example','en',$2,100,'{}')).id",
      [id(9), staff]);
    await assert.rejects(sandbox(id(5)), /Staff access required/);
    await sandbox(id(8));
    await assert.rejects(update(9, "chg_SANDBOX", "paid"), /tap_staff_sandbox_isolated/);
    const settle = () => db.query("select tap_checkout_update_sandbox($1,'chg_SANDBOX','paid') as data", [id(9)]);
    assert.equal((await settle()).rows[0].data.state, "paid");
    assert.equal((await settle()).rows[0].data.charge_id, "chg_SANDBOX");
    assert.equal(await count("orders"), 0);
    assert.equal(await count("staff_alerts"), 0);
    assert.equal(await count("coupon_redemptions"), 0);
    assert.equal(await stock("variants"), 2);
    assert.equal(await stock("samples"), 2);

    await begin(6);
    await begin(6);
    await assert.rejects(begin(6, "other key"), /Invalid payment attempt/);
    await assert.rejects(begin(7, "key", { ...order, referral_code: "" }), /coupon:exhausted/);
    await assert.rejects(begin(7, "key", { ...order, coupon_code: "" }), /referral:repeat/);
    assert.equal(await stock("variants"), 1);
    assert.equal(await stock("samples"), 1);
    assert.equal(await count("orders"), 0);
    assert.equal(await count("staff_alerts"), 0);

    await update(6, "chg_FIRST", "pending");
    await assert.rejects(update(6, "chg_WRONG", "paid"), /mismatch/);
    await update(6, "chg_FIRST", "failed");
    assert.equal(await stock("variants"), 2);
    assert.equal(await stock("samples"), 2);
    assert.equal(await count("coupon_redemptions"), 0);

    await begin(7);
    const capture = await update(7, "chg_SECOND", "paid");
    const retry = await update(7, "chg_SECOND", "paid");
    assert.equal(capture.created, true);
    assert.equal(retry.created, false);
    assert.equal(capture.order_id, retry.order_id);
    assert.equal(await count("orders"), 1);
    assert.equal(await count("staff_alerts"), 1);
    assert.equal(await count("order_items"), 2);
    assert.equal(await count("coupon_redemptions"), 1);
    assert.equal(await stock("variants"), 1);
    assert.equal(await stock("samples"), 1);
    assert.equal((await db.query("select payment_status,tap_charge_id from orders")).rows[0].payment_status, "paid");

    const cod = { ...order, coupon_code: "", referral_code: "", sample_ids: [], payment_method: "cod" };
    const commit = qty => db.query("select storefront_checkout_commit($1,$2)", [JSON.stringify(cod), JSON.stringify([{ ...line, qty }])]);
    await assert.rejects(commit(2), /Out of stock/);
    await commit(1);
    assert.equal(await count("orders"), 2);
    assert.equal(await stock("variants"), 0);
    assert.equal((await db.query("select sales_count from products")).rows[0].sales_count, 2);
  } finally {
    await db.close();
  }
});
