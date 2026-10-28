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
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require: (n) => (n in mocks ? mocks[n] : require(n)),
      process,
      URL,
      Request,
      Response,
      Buffer,
      AbortSignal,
      console,
      setTimeout,
      ...globals,
    },
  );
  return exports;
}
const rules = load("src/lib/notification-rules.ts");
test("confirmation, tracking and terminal updates select their approved templates and exact variables",async()=>{
 const shared=load("src/lib/whatsapp-shared.ts");
 for(const status of ["new","confirmed","dispatched","returned"]){
  let payload,settled;
  const db={rpc:async(name)=>name==="whatsapp_claim"?{data:[{id:"job",order_id:"order",phone:"971501234567",kind:"order",revision:1,attempts:1}]}:{error:null},from:table=>{const q={select(){return q},eq(){return q},update(v){settled=v;return q},maybeSingle:async()=>({data:table==="whatsapp_contacts"?{orders_opt_in:true}:{id:"order",order_no:"MG-1",customer_name:"Ahmed",status,whatsapp_opt_in:true,whatsapp_revision:1,tracking_no:status==="confirmed"?null:"TRACK-1",tracking_url:"https://courier.test"}}),then(resolve){resolve({error:null})}};return q}};
  const worker=load("src/lib/whatsapp.ts",{"server-only":{},"./supabase/service":{createAdminClient:()=>db},"./order-access":{getOrderAccessPath:async()=>"/orders/private"},"./site-url":{getSiteUrl:()=>"https://shop.test"},"./order-status":{statusLabel:s=>s},"./whatsapp-shared":shared,"./order-tracking":{trackingLink:()=>"https://courier.test/track"}},{process:{env:{WHATSAPP_ENABLED:"1",WHATSAPP_ACCESS_TOKEN:"test",WHATSAPP_PHONE_NUMBER_ID:"123",WHATSAPP_API_VERSION:"v25.0",WHATSAPP_ORDER_TEMPLATE:"order_update",WHATSAPP_CONFIRMATION_TEMPLATE:"order_confirmed",WHATSAPP_TRACKING_TEMPLATE:"order_tracking"}},fetch:async(url,opts)=>{payload=JSON.parse(opts.body);return{ok:true,status:200,json:async()=>({messages:[{id:"wamid.test"}]})}}});
  await worker.processWhatsAppQueue();
  if(status==="new"){assert.equal(payload,undefined);assert.equal(settled.state,"skipped");continue;}
  const values=payload.template.components[0].parameters.map(v=>v.text);
  if(status==="confirmed"){assert.equal(payload.template.name,"order_confirmed");assert.deepEqual(values,["Ahmed","MG-1","https://shop.test/orders/private"]);}
  else if(status==="dispatched"){assert.equal(payload.template.name,"order_tracking");assert.deepEqual(values,["Ahmed","MG-1","dispatched","TRACK-1","https://courier.test/track","https://shop.test/orders/private"]);}
  else{assert.equal(payload.template.name,"order_update");assert.deepEqual(values,["Ahmed","MG-1","returned","https://shop.test/orders/private"]);}
 }
});
test("master mail switch and every category are enforced at the final SMTP boundary", async () => {
  let enabled = true,
    allowed = true,
    sends = 0,
    kinds = [];
  const mail = load(
    "src/lib/mailer.ts",
    {
      "./order-tracking": {},
      "./notification-settings": {
        systemEmailAllowed: async (kind) => {
          kinds.push(kind);
          return enabled && allowed;
        },
      },
      nodemailer: {
        createTransport: () => ({
          sendMail: async () => {
            sends++;
          },
        }),
      },
    },
    {
      process: {
        env: { SMTP_HOST: "test", SMTP_USER: "sender@test", SMTP_PASS: "test" },
      },
    },
  );
  const opts = {
    to: "user@test",
    subject: "Test",
    title: "Test",
    preheader: "",
    bodyHtml: "<p>Test</p>",
  };
  assert.equal((await mail.sendMailboxMail("noreply", opts)).sent, true);
  enabled = false;
  assert.equal((await mail.sendMailboxMail("noreply", opts)).disabled, true);
  enabled = true;
  allowed = false;
  assert.equal((await mail.sendMailboxMail("hello", opts)).sent, false);
  allowed = true;
  await mail.sendMailboxMail("hello", { ...opts, kind: "contact_alerts" });
  assert.equal(sends, 2);
  assert.deepEqual(kinds, [
    "order_updates",
    "order_updates",
    "welcome",
    "contact_alerts",
  ]);
  const settings = {
    available: true,
    email_enabled: true,
    email_rules: Object.fromEntries(
      rules.EMAIL_RULES.map((r) => [r.key, true]),
    ),
  };
  for (const r of rules.EMAIL_RULES) {
    assert.equal(rules.mailAllowed(settings, r.key), true);
    assert.equal(
      rules.mailAllowed({ ...settings, available: false }, r.key),
      false,
    );
  }
});
test("settings read failure suppresses application mail rather than bypassing the master switch", async () => {
  const db = {
    from: () => {
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        single: async () => ({ error: { code: "offline" }, data: null }),
      };
      return q;
    },
  };
  const settings = load("src/lib/notification-settings.ts", {
    "server-only": {},
    "./supabase/service": { createAdminClient: () => db },
    "./notification-rules": rules,
  });
  assert.equal((await settings.getNotificationSettings()).available, false);
  assert.equal(await settings.systemEmailAllowed("order_updates"), false);
});
test("final SQL workflow has no placement WhatsApp, records consent, queues Telegram, and increments tracking revisions", async (t) => {
  if (!process.env.ANALYTICS_PGLITE_MODULE)
    return t.skip("Set ANALYTICS_PGLITE_MODULE");
  const { PGlite } = require(process.env.ANALYTICS_PGLITE_MODULE),
    db = new PGlite();
  const staff = "10000000-0000-4000-8000-000000000001",
    id = "20000000-0000-4000-8000-000000000001";
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;create table profiles(id uuid primary key,role text);create table orders(id uuid primary key,phone text,country_code text,status text default 'new',tracking_no text,tracking_url text,deleted_at timestamptz);insert into profiles values('${staff}','super_admin');`,
    );
    await db.exec(fs.readFileSync("supabase/migration_whatsapp.sql", "utf8"));
    const sql = fs.readFileSync(
      "supabase/migration_notification_control.sql",
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(
      `insert into orders(id,phone,country_code,whatsapp_opt_in) values('${id}','+971501234567','AE',true)`,
    );
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      0,
    );
    assert.equal(
      (await db.query("select count(*)::int n from telegram_order_alerts"))
        .rows[0].n,
      1,
    );
    await db.query("select whatsapp_queue_order($1)", [id]);
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      0,
    );
    await db.exec(`update orders set status='confirmed' where id='${id}'`);
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      0,
    );
    await db.query("select whatsapp_queue_order($1)", [id]);
    await db.query("select whatsapp_queue_order($1)", [id]);
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      1,
    );
    await db.exec(
      `update orders set tracking_no='TRACK-1',tracking_url='https://courier.test' where id='${id}'`,
    );
    assert.equal(
      (await db.query("select whatsapp_revision from orders")).rows[0]
        .whatsapp_revision,
      2,
    );
    await db.query("select whatsapp_queue_order($1)", [id]);
    assert.equal(
      (await db.query("select count(*)::int n from whatsapp_messages")).rows[0]
        .n,
      2,
    );
    const jobs = (await db.query("select * from telegram_claim(5)")).rows;
    assert.equal(jobs.length, 1);
    assert.equal(
      (await db.query("select * from telegram_claim(5)")).rows.length,
      0,
    );
    await db.exec(
      `update telegram_order_alerts set updated_at=now()-interval '3 minutes'`,
    );
    await db.query("select * from telegram_claim(5)");
    assert.equal(
      (await db.query("select state from telegram_order_alerts")).rows[0].state,
      "unknown",
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from notification_settings"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from telegram_claim(5)"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("Telegram sends a compact staff alert with an authenticated admin link and no customer address", async () => {
  let payload;
  let updates = [];
  const id = "20000000-0000-4000-8000-000000000001";
  const db = {
    rpc: async () => ({
      data: [
        {
          id: "job",
          order_id: id,
          attempts: 1,
          created_at: new Date().toISOString(),
        },
      ],
    }),
    from: () => {
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
        maybeSingle: async () => ({
          data: {
            id,
            order_no: "GZ1042",
            customer_name: "Ahmed",
            total: 249,
            payment_method: "cod",
            status: "new",
          },
        }),
        then(resolve) {
          resolve({ error: null });
        },
      };
      return q;
    },
  };
  const worker = load(
    "src/lib/telegram.ts",
    {
      "server-only": {},
      "./supabase/service": { createAdminClient: () => db },
      "./notification-settings": {
        getNotificationSettings: async () => ({
          available: true,
          telegram_new_order: true,
        }),
      },
      "./site-url": { getSiteUrl: () => "https://shop.test" },
      "./admin-orders-model": { paymentMethodLabel: () => "Cash on delivery" },
    },
    {
      process: {
        env: { TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_CHAT_ID: "-100123" },
      },
      fetch: async (url, opts) => {
        assert.equal(url, "https://api.telegram.org/bottest-token/sendMessage");
        payload = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, result: { message_id: 123 } }),
        };
      },
    },
  );
  await worker.processTelegramQueue();
  assert.equal(payload.chat_id, "-100123");
  assert.match(
    payload.text,
    /New Order\n\nOrder: #GZ1042\nCustomer: Ahmed\nTotal: AED 249.00\nPayment: Cash on delivery\nStatus: Pending processing/,
  );
  assert.equal(
    payload.reply_markup.inline_keyboard[0][0].url,
    `https://shop.test/admin/orders/${id}`,
  );
  assert.equal(updates[0].state, "sent");
});
test("WhatsApp webhook registration echoes only a valid configured verification challenge", async () => {
  const route = load(
    "src/app/api/whatsapp/webhook/route.ts",
    { "@/lib/supabase/service": {}, "@/lib/whatsapp-shared": {} },
    { process: { env: { WHATSAPP_WEBHOOK_VERIFY_TOKEN: "qa-verify" } } },
  );
  const ok = await route.GET(
    new Request(
      "https://shop.test/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=qa-verify&hub.challenge=123456",
    ),
  );
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "123456");
  assert.equal(
    (
      await route.GET(
        new Request(
          "https://shop.test/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123456",
        ),
      )
    ).status,
    403,
  );
});
