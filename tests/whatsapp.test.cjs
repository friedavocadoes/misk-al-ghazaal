const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  ts = require("typescript");
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (n) => (n in mocks ? mocks[n] : require(n)),
      URL,
      Request,
      Response,
      Buffer,
      process,
      AbortSignal,
      console,
      ...globals,
    },
  );
  return exports;
}
const shared = load("src/lib/whatsapp-shared.ts");
test("order status messages contain the private link; removed or stale revisions never send", async () => {
  for (const mode of ["cancelled", "binned", "stale", "provider-rejected"]) {
    let payload,
      updates = [],
      receipts = [];
    const db = {
      rpc: async (name, args) => {
        if (name === "whatsapp_claim")
          return {
            data: [
              {
                id: "job",
                order_id: "order",
                phone: "971501234567",
                kind: "order",
                revision: 2,
                attempts: 1,
              },
            ],
          };
        receipts.push(args);
        return { error: null };
      },
      from: (table) => {
        const read = () => ({
          error: null,
          data:
            table === "whatsapp_contacts"
              ? { orders_opt_in: true }
              : table === "orders"
                ? {
                    id: "order",
                    order_no: "MG-1234",
                    customer_name: "Samira",
                    status: "cancelled",
                    total: 189,
                    whatsapp_opt_in: true,
                    whatsapp_revision: mode === "stale" ? 3 : 2,
                    deleted_at: mode === "binned" ? "today" : null,
                  }
                : [{ title: "Oud", qty: 2 }],
        });
        const q = {
          select() {
            return q;
          },
          eq() {
            return q;
          },
          update(v) {
            updates.push(v);
            return q;
          },
          maybeSingle: async () => read(),
          then(resolve) {
            resolve(read());
          },
        };
        return q;
      },
    };
    const worker = load(
      "src/lib/whatsapp.ts",
      {
        "server-only": {},
        "./supabase/service": { createAdminClient: () => db },
        "./order-access": {
          getOrderAccessPath: async () => "/orders/opaque-key",
        },
        "./site-url": { getSiteUrl: () => "https://shop.test" },
        "./order-status": { statusLabel: () => "Cancelled" },
        "./whatsapp-shared": shared,
        "./order-tracking": { trackingLink: () => "https://courier.test" },
      },
      {
        process: {
          env: {
            WHATSAPP_ENABLED: "1",
            WHATSAPP_ACCESS_TOKEN: "test",
            WHATSAPP_PHONE_NUMBER_ID: "123",
            WHATSAPP_API_VERSION: "v25.0",
            WHATSAPP_ORDER_TEMPLATE: "order_update",
          },
        },
        fetch: async (url, opts) => {
          payload = JSON.parse(opts.body);
          return {
            ok: mode !== "provider-rejected",
            status: mode === "provider-rejected" ? 400 : 200,
            json: async () =>
              mode === "provider-rejected"
                ? { error: { code: 131026 } }
                : { messages: [{ id: "wamid.receipt" }] },
          };
        },
      },
    );
    await worker.processWhatsAppQueue();
    if (mode === "binned" || mode === "stale") {
      assert.equal(payload, undefined);
      assert.equal(updates[0].state, "skipped");
    } else if (mode === "provider-rejected") {
      assert.equal(updates[0].state, "failed");
      assert.equal(updates[0].error_code, "131026");
    } else {
      const values = payload.template.components[0].parameters.map(
        (v) => v.text,
      );
      assert.deepEqual(values, [
        "Samira",
        "MG-1234",
        "Cancelled",
        "https://shop.test/orders/opaque-key",
      ]);
      assert.equal(receipts[0].p_state, "accepted");
      assert.equal(payload.biz_opaque_callback_data, "job");
    }
  }
});
test("WhatsApp preferences require verified customer auth and never trust a supplied account ID", async () => {
  for (const mode of [
    "guest",
    "unverified",
    "staff",
    "customer",
    "cross-site",
  ]) {
    let writes = [];
    const db = {
      from: () => {
        const q = {
          select() {
            return q;
          },
          eq() {
            return q;
          },
          single: async () => ({
            data: { role: mode === "staff" ? "super_admin" : "customer" },
            error: null,
          }),
        };
        return q;
      },
      rpc: async (name, args) => {
        writes.push(args);
        return { error: null };
      },
    };
    const route = load("src/app/api/whatsapp/preferences/route.ts", {
      "@/lib/supabase/server": {
        createClient: async () => ({
          auth: {
            getUser: async () => ({
              data: {
                user:
                  mode === "guest"
                    ? null
                    : {
                        id: "actual-user",
                        email_confirmed_at:
                          mode === "unverified" ? null : "confirmed",
                      },
              },
            }),
          },
        }),
      },
      "@/lib/supabase/service": { createAdminClient: () => db },
      "@/lib/whatsapp-shared": shared,
    });
    const res = await route.POST(
      new Request("https://shop.test/api/whatsapp/preferences", {
        method: "POST",
        headers: {
          origin:
            mode === "cross-site" ? "https://other.test" : "https://shop.test",
        },
        body: JSON.stringify({
          phone: "+971501234567",
          orders: true,
          marketing: true,
          user_id: "some-other-user",
        }),
      }),
    );
    if (mode === "customer") {
      assert.equal(res.status, 200);
      assert.equal(writes[0].p_user, "actual-user");
    } else {
      assert.equal(writes.length, 0);
      assert.equal(
        res.status,
        mode === "guest" || mode === "unverified" ? 401 : 403,
      );
    }
  }
});
test("WhatsApp validates international destinations and template parameters without guessing non-UAE numbers", () => {
  assert.equal(shared.whatsappPhone("+971 50 123 4567"), "971501234567");
  assert.equal(shared.whatsappPhone("00971501234567"), "971501234567");
  assert.equal(shared.whatsappPhone("0501234567", "AE"), "971501234567");
  for (const number of [
    "0501234567",
    "971501234567",
    "+123",
    "+971<script>",
    "+0123456789",
  ])
    assert.equal(shared.whatsappPhone(number), null);
  assert.throws(() => shared.templateParameters(["x".repeat(501)]));
  assert.throws(() => shared.templateParameters([1]));
  assert.throws(() => shared.whatsappTemplate("../bad", "en", []));
  assert.equal(
    shared.whatsappTemplate("maison", "en_US", ["hello"]).components[0]
      .parameters[0].text,
    "hello",
  );
  assert.equal(shared.isWhatsAppStop(" STOP "), true);
  assert.equal(shared.isWhatsAppStop("Please stop by the shop"), false);
});
test("WhatsApp queue migration: private data, consent isolation, dedupe, campaign snapshots, atomic claims and monotonic receipts", async (t) => {
  if (!process.env.ANALYTICS_PGLITE_MODULE)
    return t.skip("Set ANALYTICS_PGLITE_MODULE");
  const { PGlite } = require(process.env.ANALYTICS_PGLITE_MODULE),
    db = new PGlite();
  const customer = "10000000-0000-4000-8000-000000000001",
    staff = "10000000-0000-4000-8000-000000000002",
    order = "20000000-0000-4000-8000-000000000001";
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;create table profiles(id uuid primary key,role text);create table orders(id uuid primary key,phone text,country_code text,status text default 'new',deleted_at timestamptz);insert into profiles values('${customer}','customer'),('${staff}','super_admin');`,
    );
    const sql = fs.readFileSync("supabase/migration_whatsapp.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(
      `insert into orders(id,phone,country_code,whatsapp_opt_in) values('${order}','0501234567','AE',true)`,
    );
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      1,
    );
    assert.equal(
      (await db.query("select marketing_opt_in from whatsapp_contacts")).rows[0]
        .marketing_opt_in,
      false,
    );
    await db.query("select whatsapp_queue_order($1)", [order]);
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      1,
    );
    await db.exec(`update orders set status='confirmed' where id='${order}'`);
    assert.equal(
      (await db.query("select whatsapp_revision from orders")).rows[0]
        .whatsapp_revision,
      1,
    );
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      1,
    );
    await db.query("select whatsapp_queue_order($1)", [order]);
    await db.query("select whatsapp_queue_order($1)", [order]);
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      2,
    );
    const claimed = (await db.query("select * from whatsapp_claim(1)")).rows;
    assert.equal(claimed.length, 1);
    assert.equal(
      (await db.query("select * from whatsapp_claim(1)")).rows[0].id ===
        claimed[0].id,
      false,
    );
    const id = claimed[0].id;
    await db.query("select whatsapp_receipt_status($1,$2,$3,$4)", [
      id,
      "wamid.test",
      "sent",
      null,
    ]);
    await db.query("select whatsapp_receipt_status($1,$2,$3,$4)", [
      id,
      "wamid.test",
      "failed",
      "131026",
    ]);
    assert.equal(
      (await db.query("select state from whatsapp_messages where id=$1", [id]))
        .rows[0].state,
      "failed",
    );
    await db.query("select whatsapp_receipt_status($1,$2,$3,$4)", [
      id,
      "wamid.test",
      "read",
      null,
    ]);
    await db.query("select whatsapp_receipt_status($1,$2,$3,$4)", [
      id,
      "wamid.test",
      "accepted",
      null,
    ]);
    await db.query("select whatsapp_receipt_status($1,$2,$3,$4)", [
      id,
      "wamid.test",
      "failed",
      "131026",
    ]);
    assert.equal(
      (await db.query("select state from whatsapp_messages where id=$1", [id]))
        .rows[0].state,
      "read",
    );
    await db.query("select whatsapp_save_preferences($1,$2,true,true)", [
      customer,
      "971501234567",
    ]);
    const campaign = (
      await db.query(
        `insert into whatsapp_campaigns(name,template,created_by) values('A','approved',$1) returning id`,
        [staff],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("select whatsapp_queue_campaign($1,$2)", [customer, campaign]),
      /Forbidden/,
    );
    assert.equal(
      (
        await db.query("select whatsapp_queue_campaign($1,$2) n", [
          staff,
          campaign,
        ])
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      db.query("select whatsapp_queue_campaign($1,$2)", [staff, campaign]),
      /already queued/,
    );
    await db.query("select whatsapp_save_preferences($1,$2,false,false)", [
      customer,
      "971509999999",
    ]);
    assert.equal(
      (
        await db.query(
          "select marketing_opt_in from whatsapp_contacts where phone='971501234567'",
        )
      ).rows[0].marketing_opt_in,
      false,
    );
    await db.exec(
      `update whatsapp_messages set state='sending',updated_at=now()-interval '5 minutes' where id='${id}'`,
    );
    await db.query("select * from whatsapp_claim(1)");
    assert.equal(
      (await db.query("select state from whatsapp_messages where id=$1", [id]))
        .rows[0].state,
      "unknown",
    );
    await db.query("select whatsapp_stop($1,$2)", [
      "wamid.stop-new",
      "971507777777",
    ]);
    assert.equal(
      (
        await db.query(
          "select stopped_at is not null stopped from whatsapp_contacts where phone='971507777777'",
        )
      ).rows[0].stopped,
      true,
    );
    await db.query("select whatsapp_save_preferences($1,$2,true,true)", [
      customer,
      "971507777777",
    ]);
    await db.query("select whatsapp_stop($1,$2)", [
      "wamid.stop-new",
      "971507777777",
    ]);
    assert.equal(
      (
        await db.query(
          "select marketing_opt_in from whatsapp_contacts where phone='971507777777'",
        )
      ).rows[0].marketing_opt_in,
      true,
    );
    await db.query("delete from profiles where id=$1", [customer]);
    assert.equal(
      (
        await db.query(
          "select marketing_opt_in from whatsapp_contacts where phone='971507777777'",
        )
      ).rows[0].marketing_opt_in,
      false,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from whatsapp_contacts"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from whatsapp_claim(5)"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select whatsapp_save_preferences($1,$2,true,true)", [
        customer,
        "971501234567",
      ]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});

test("signed Meta webhook rejects spoofing, applies delivery status, and honors STOP without retaining message bodies", async () => {
  const { createHmac } = require("node:crypto");
  let calls = [];
  const db = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { error: null };
    },
    from: () => {
      const q = {
        update: (v) => {
          calls.push(["stop", v]);
          return q;
        },
        eq: async () => ({ error: null }),
      };
      return q;
    },
  };
  const env = {
    WHATSAPP_APP_SECRET: "test-secret",
    WHATSAPP_PHONE_NUMBER_ID: "123",
  };
  const endpoint = load(
    "src/app/api/whatsapp/webhook/route.ts",
    {
      "@/lib/supabase/service": { createAdminClient: () => db },
      "@/lib/whatsapp-shared": shared,
    },
    { process: { env } },
  );
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "123" },
              statuses: [
                {
                  id: "wamid.x",
                  status: "delivered",
                  biz_opaque_callback_data:
                    "20000000-0000-4000-8000-000000000001",
                },
              ],
              messages: [
                {
                  id: "wamid.stop",
                  from: "971501234567",
                  text: { body: "STOP" },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  let r = await endpoint.POST(
    new Request("https://shop.test/api/whatsapp/webhook", {
      method: "POST",
      body,
    }),
  );
  assert.equal(r.status, 403);
  assert.equal(calls.length, 0);
  r = await endpoint.POST(
    new Request("https://shop.test/api/whatsapp/webhook", {
      method: "POST",
      body,
      headers: {
        "x-hub-signature-256":
          "sha256=" +
          createHmac("sha256", "test-secret").update(body).digest("hex"),
      },
    }),
  );
  assert.equal(r.status, 200);
  assert.equal(calls[0][0], "whatsapp_receipt_status");
  assert.equal(calls[1][0], "whatsapp_stop");
  assert.equal(calls[1][1].p_phone, "971501234567");
  assert.equal(JSON.stringify(calls).includes("STOP"), false);
});

test("queue worker rechecks consent, distinguishes acceptance from delivery and never automatically retries ambiguous sends", async () => {
  for (const mode of ["optout", "accepted", "timeout", "rate-limit"]) {
    let sends = 0,
      patches = [],
      receipts = [];
    const job = {
      id: "job",
      kind: "marketing",
      phone: "971501234567",
      campaign_id: "campaign",
      attempts: 1,
    };
    const db = {
      rpc: async (name, args) => {
        if (name === "whatsapp_claim") return { data: [job] };
        receipts.push(args);
        return { error: null };
      },
      from: (table) => {
        let update;
        const q = {
          select() {
            return q;
          },
          update(v) {
            update = v;
            patches.push(v);
            return q;
          },
          eq() {
            return q;
          },
          maybeSingle: async () => ({
            data:
              table === "whatsapp_contacts"
                ? { marketing_opt_in: mode !== "optout" }
                : {
                    template: "approved",
                    language: "en",
                    parameters: [],
                    queued_at: "now",
                  },
          }),
          then(resolve) {
            resolve({ error: null });
          },
        };
        return q;
      },
    };
    const env = {
      WHATSAPP_ENABLED: "1",
      WHATSAPP_ACCESS_TOKEN: "secret",
      WHATSAPP_PHONE_NUMBER_ID: "123",
      WHATSAPP_API_VERSION: "v25.0",
      WHATSAPP_ORDER_TEMPLATE: "order",
    };
    const worker = load(
      "src/lib/whatsapp.ts",
      {
        "server-only": {},
        "./supabase/service": { createAdminClient: () => db },
        "./order-access": {},
        "./site-url": {},
        "./order-status": {},
        "./whatsapp-shared": shared,
        "./order-tracking": { trackingLink: () => "https://courier.test" },
      },
      {
        process: { env },
        fetch: async () => {
          sends++;
          if (mode === "timeout") throw Error("timeout");
          return {
            ok: mode === "accepted",
            status: mode === "rate-limit" ? 429 : 200,
            json: async () =>
              mode === "accepted"
                ? { messages: [{ id: "wamid.test" }] }
                : { error: { code: 130429 } },
          };
        },
      },
    );
    await worker.processWhatsAppQueue();
    if (mode === "optout") {
      assert.equal(sends, 0);
      assert.equal(patches[0].state, "skipped");
    } else if (mode === "accepted") {
      assert.equal(receipts[0].p_state, "accepted");
    } else if (mode === "timeout") {
      assert.equal(patches[0].state, "unknown");
    } else assert.equal(patches[0].state, "pending");
  }
});
