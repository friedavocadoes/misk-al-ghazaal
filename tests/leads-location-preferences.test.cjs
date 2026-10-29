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
      URLSearchParams,
      Request,
      Response,
      Headers,
      Buffer,
      AbortSignal,
      console,
      ...globals,
    },
  );
  return exports;
}
const csv = load("src/lib/lead-csv.ts"),
  location = load("src/lib/analytics/location.ts");
test("customer email has a real preference link and one-click headers; later opt-out blocks marketing but not essential email",async()=>{
 let marketing=true;const sent=[];
 const mail=load('src/lib/mailer.ts',{'./order-tracking':{},'./notification-settings':{systemEmailAllowed:async()=>true},'./leads':{getEmailCommunicationLink:async()=>({url:'https://shop.test/preferences/private',unsubscribeUrl:'https://shop.test/api/preferences/private/unsubscribe',marketing})},nodemailer:{createTransport:()=>({sendMail:async m=>{sent.push(m)}})}},{process:{env:{SMTP_HOST:'test',SMTP_USER:'staff@test.example',SMTP_PASS:'test'}}});
 const opts={to:'customer@test.example',subject:'Test',title:'Test',preheader:'',bodyHtml:'<p>Test</p>'};
 assert.equal((await mail.sendMailboxMail('promo',opts)).sent,true);assert.match(sent[0].html,/https:\/\/shop.test\/preferences\/private/);assert.match(sent[0].text,/Manage email and WhatsApp preferences/);assert.equal(sent[0].headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');
 marketing=false;assert.equal((await mail.sendMailboxMail('promo',opts)).disabled,true);assert.equal((await mail.sendMailboxMail('noreply',opts)).sent,true);assert.equal(sent.length,2);
});
test("campaign worker rechecks opt-outs, pauses on the master switch and does not blindly retry SMTP uncertainty",async()=>{
 for(const mode of ['allow','unsubscribed','master-off','uncertain']){
  let claims=0,sends=0,updates=[];const db={rpc:async name=>{if(name==='claim_email_deliveries'){claims++;return{data:[{id:'job',campaign_id:'c',lead_id:'lead'}]}}return{error:null}},from:table=>{const q={select(){return q},eq(){return q},update(v){updates.push(v);return q},maybeSingle:async()=>({data:table==='customer_leads'?{email:'a@test.example',marketing_email:mode!=='unsubscribed'}:{queued_at:'now',subject:'Test'}}),then(resolve){resolve({error:null})}};return q}};
  const worker=load('src/lib/email-campaigns.ts',{'server-only':{},'./supabase/service':{createAdminClient:()=>db},'./notification-settings':{systemEmailAllowed:async()=>mode!=='master-off'},'./mailer':{smtpConnectionSettings:()=>({host:'smtp.test'}),sendMailboxMail:async()=>{sends++;return{sent:mode!=='uncertain'}}}},{process:{env:{SMTP_USER:'a',SMTP_PASS:'b'}}});
  await worker.processEmailCampaignQueue();
  if(mode==='master-off'){assert.equal(claims,0);assert.equal(sends,0)}else if(mode==='unsubscribed'){assert.equal(sends,0);assert.equal(updates[0].state,'skipped')}else assert.equal(updates[0].state,mode==='allow'?'sent':'unknown');
 }
});
test("one-click email unsubscribe accepts only its token and POST body, without requiring login",async()=>{
 let saves=[];const db={from:()=>{const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{email:'a@test.example'}})};return q},rpc:async(name,args)=>{saves.push(args);return{error:null}}};const token='a'.repeat(64);
 const route=load('src/app/api/preferences/[token]/unsubscribe/route.ts',{'@/lib/supabase/service':{createAdminClient:()=>db},'@/lib/leads':{validPreferenceToken:t=>/^[a-f0-9]{64}$/.test(t)}});
 assert.equal(route.GET,undefined);let res=await route.POST(new Request('https://shop.test/api/preferences/'+token+'/unsubscribe',{method:'POST',body:'List-Unsubscribe=One-Click&email=someone-else@test.example'}),{params:Promise.resolve({token})});assert.equal(res.status,200);assert.equal(saves[0].p_token,token);assert.equal(Object.keys(saves[0]).length,1);
 res=await route.POST(new Request('https://shop.test/api/preferences/'+token+'/unsubscribe',{method:'POST',body:'email=a@test.example'}),{params:Promise.resolve({token})});assert.equal(res.status,400);assert.equal(saves.length,1);
});
test("lead CSV handles BOM, quoted commas/newlines, optional permission and rejects malformed imports", () => {
  const rows = csv.parseLeadCSV(
    '\ufeffemail,name,location,phone,marketing_consent\r\nSAM@example.test,"Sam, Ali","Dubai\nUAE",+971501234567,yes\r\n',
  );
  assert.equal(rows[0].email, "sam@example.test");
  assert.equal(rows[0].name, "Sam, Ali");
  assert.equal(rows[0].location, "Dubai\nUAE");
  assert.equal(rows[0].consent, true);
  assert.equal(
    csv.parseLeadCSV("email,name\na@test.example,Ali")[0].consent,
    false,
  );
  for (const s of [
    "email,email\na@test,a@test",
    "name\nAli",
    "email,name\nnot-email,Ali",
    'email,name\n"a@test.example,Ali',
  ])
    assert.throws(() => csv.parseLeadCSV(s));
});
test("lead sources merge, opt-outs survive imports and later purchases, guest tokens work without login, CSV import is atomic", async (t) => {
  if (!process.env.ANALYTICS_PGLITE_MODULE)
    return t.skip("Set ANALYTICS_PGLITE_MODULE");
  const { PGlite } = require(process.env.ANALYTICS_PGLITE_MODULE),
    db = new PGlite();
  const staff = "10000000-0000-4000-8000-000000000001",
    customer = "10000000-0000-4000-8000-000000000002",
    order = "20000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,email text,role text,full_name text,phone text,promo_opt_in boolean default true,order_updates_opt_in boolean default true);
 create table orders(id uuid primary key,user_id uuid,email text,customer_name text,phone text,city text,country_code text,status text default 'new',tracking_no text,tracking_url text,deleted_at timestamptz);
 create table promo_campaigns(id uuid primary key,status text default 'draft',subject text,preheader text,body_html text,recipient_count int default 0,sent_at timestamptz);
 insert into profiles(id,email,role,full_name,promo_opt_in) values('${staff}','staff@test.example','super_admin','Staff',false),('${customer}','account@test.example','customer','Account',true);`);
    for (const file of [
      "migration_whatsapp.sql",
      "migration_notification_control.sql",
      "migration_leads_preferences.sql",
    ])
      await db.exec(fs.readFileSync("supabase/" + file, "utf8"));
    await db.exec(
      fs.readFileSync("supabase/migration_leads_preferences.sql", "utf8"),
    );
    await db.query("select newsletter_signup($1,$2,$3)", [
      "sender1",
      "GUEST@test.example",
      "Guest",
    ]);
    await db.exec(
      `insert into orders(id,email,phone,city,country_code,customer_name,whatsapp_opt_in) values('${order}','guest@test.example','+971501234567','Dubai','AE','Guest',true)`,
    );
    let l = (
      await db.query(
        "select * from customer_leads where email='guest@test.example'",
      )
    ).rows[0];
    assert.equal(l.sources.includes("newsletter"), true);
    assert.equal(l.sources.includes("guest_order"), true);
    assert.equal(l.marketing_email, true);
    assert.equal(l.phone, "+971501234567");
    await db.query(
      "select save_communication_preferences($1,false,false,false)",
      [l.preference_token],
    );
    await db.query("select capture_lead($1,$2,$3,$4,$5,true)", [
      "guest@test.example",
      "manual",
      "New name",
      "",
      "",
    ]);
    l = (
      await db.query(
        "select * from customer_leads where email='guest@test.example'",
      )
    ).rows[0];
    assert.equal(l.marketing_email, false);
    assert.equal(l.sources.includes("manual"), true);
    assert.notEqual(l.unsubscribed_at, null);
    await db.query(
      "select save_communication_preferences($1,true,true,false)",
      [l.preference_token],
    );
    assert.equal(
      (
        await db.query(
          "select orders_opt_in from whatsapp_contacts where phone='971501234567'",
        )
      ).rows[0].orders_opt_in,
      true,
    );
    const waToken = (
      await db.query("select order_whatsapp_preference($1) token", [order])
    ).rows[0].token;
    await db.query(
      "select save_communication_preferences($1,false,false,false)",
      [waToken],
    );
    assert.equal(
      (
        await db.query(
          "select orders_opt_in from whatsapp_contacts where phone='971501234567'",
        )
      ).rows[0].orders_opt_in,
      false,
    );
    await db.exec(
      "insert into orders(id,email,phone,city,country_code,customer_name,whatsapp_opt_in) values('20000000-0000-4000-8000-000000000002','guest@test.example','+971501234567','Dubai','AE','Guest',true)",
    );
    assert.equal(
      (
        await db.query(
          "select orders_opt_in from whatsapp_contacts where phone='971501234567'",
        )
      ).rows[0].orders_opt_in,
      false,
    );
    await db.query("select unsubscribe_lead_email($1)", [l.preference_token]);
    await db.query("select unsubscribe_lead_email($1)", [l.preference_token]);
    assert.equal(
      (
        await db.query(
          "select marketing_email from customer_leads where email='guest@test.example'",
        )
      ).rows[0].marketing_email,
      false,
    );
    await assert.rejects(
      db.query("select save_communication_preferences($1,true,true,true)", [
        "x".repeat(64),
      ]),
      /Invalid/,
    );
    await assert.rejects(
      db.query("select import_customer_leads($1,$2)", [
        customer,
        JSON.stringify([{ email: "manual@test.example" }]),
      ]),
      /Forbidden/,
    );
    await assert.rejects(
      db.query("select import_customer_leads($1,$2)", [
        staff,
        JSON.stringify([
          { email: "valid@test.example", consent: true },
          { email: "bad", consent: true },
        ]),
      ]),
      /Invalid lead/,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from customer_leads where email='valid@test.example'",
        )
      ).rows[0].n,
      0,
    );
    await db.query("select import_customer_leads($1,$2)", [
      staff,
      JSON.stringify([
        { email: "manual@test.example", name: "Manual", consent: false },
      ]),
    ]);
    assert.equal(
      (
        await db.query(
          "select marketing_email from customer_leads where email='manual@test.example'",
        )
      ).rows[0].marketing_email,
      false,
    );
    for (let i = 0; i < 3; i++)
      await db.query("select newsletter_signup($1,$2,$3)", [
        "sender2",
        "limited@test.example",
        "Limited",
      ]);
    await assert.rejects(
      db.query("select newsletter_signup($1,$2,$3)", [
        "sender3",
        "limited@test.example",
        "Limited",
      ]),
      /Please wait/,
    );
    await db.exec("insert into profiles(id,email,role,promo_opt_in) values('10000000-0000-4000-8000-000000000003','guest@test.example','customer',true)");
    assert.equal((await db.query("select promo_opt_in from profiles where email='guest@test.example'")).rows[0].promo_opt_in,false);
    const campaign = "30000000-0000-4000-8000-000000000001";
    await db.query(
      "insert into promo_campaigns(id,subject) values($1,'Test')",
      [campaign],
    );
    assert.equal(
      (
        await db.query("select queue_email_campaign($1,$2) n", [
          staff,
          campaign,
        ])
      ).rows[0].n,
      1,
    );
    await assert.rejects(
      db.query("select queue_email_campaign($1,$2)", [staff, campaign]),
      /already queued/,
    );
    assert.equal(
      (await db.query("select * from claim_email_deliveries()")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from claim_email_deliveries()")).rows.length,
      0,
    );
    await db.query("select geo_lookup_slot($1)", ["a".repeat(64)]);
    assert.equal(
      (await db.query("select geo_lookup_slot($1) b", ["a".repeat(64)])).rows[0]
        .b,
      false,
    );
    await db.exec(
      "update analytics_geo_budget set used=949 where day=current_date",
    );
    assert.equal(
      (await db.query("select geo_lookup_slot($1) b", ["b".repeat(64)])).rows[0]
        .b,
      true,
    );
    assert.equal(
      (await db.query("select geo_lookup_slot($1) b", ["c".repeat(64)])).rows[0]
        .b,
      false,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from customer_leads"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select save_communication_preferences($1,true,true,true)", [
        l.preference_token,
      ]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("IP lookup ignores spoofed/untrusted headers, rejects private IPs, caches the explicit visitor IP and respects the free budget", async () => {
  let calls = 0,
    writes = [],
    key;
  const db = {
    from: () => {
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          key = v;
          return q;
        },
        update(v) {
          writes.push(v);
          return q;
        },
        maybeSingle: async () => ({ data: null, error: null }),
        then(resolve) {
          resolve({ error: null });
        },
      };
      return q;
    },
    rpc: async () => ({ data: true }),
  };
  const mocks = {
    "server-only": {},
    "../supabase/service": { createAdminClient: () => db },
    "./location": location,
  };
  const env = { VERCEL: "1", COMMUNICATION_PREFERENCES_SECRET: "qa-secret" };
  const geo = load("src/lib/analytics/ip-location.ts", mocks, {
    process: { env },
    fetch: async (url) => {
      calls++;
      assert.equal(url, "https://ipwho.is/8.8.4.4");
      return {
        ok: true,
        json: async () => ({
          success: true,
          country_code: "AE",
          region_code: "DU",
          city: "Dubai",
        }),
      };
    },
  });
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "::1",
    "fc00::1",
    "169.254.169.254",
    "203.0.113.1",
    "not-ip",
  ])
    assert.equal(geo.publicIP(ip), null);
  const req = new Request("https://shop.test/api/analytics/collect", {
    headers: {
      "x-vercel-forwarded-for": "8.8.4.4",
      "x-vercel-ip-country": "US",
    },
  });
  let r = await geo.resolveAnalyticsLocation(req);
  assert.equal(r.country, "AE");
  assert.equal(r.location_source, "ipwhois");
  assert.equal(calls, 1);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(writes).includes("8.8.4.4"), false);
  env.VERCEL = "0";
  r = await geo.resolveAnalyticsLocation(req);
  assert.equal(r.country, null);
  assert.equal(calls, 1);
  env.VERCEL = "1";
  r = await geo.resolveAnalyticsLocation(
    new Request("https://shop.test", {
      headers: { "x-forwarded-for": "127.0.0.1", "x-vercel-ip-country": "AE" },
    }),
  );
  assert.equal(r.country, "AE");
  assert.equal(calls, 1);
});
test("city filter is based on actual visited cities, filters pages/conversions and preserves paid-only revenue", async (t) => {
  if (!process.env.ANALYTICS_PGLITE_MODULE)
    return t.skip("Set ANALYTICS_PGLITE_MODULE");
  const { PGlite } = require(process.env.ANALYTICS_PGLITE_MODULE),
    db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;
 create table analytics_sessions(id uuid primary key,visitor_id text,user_id uuid,country text,region text,city text,emirate text,is_bot boolean,location_source text,created_at timestamptz default now(),last_seen_at timestamptz default now());
 create table orders(id uuid primary key,total numeric,payment_status text,deleted_at timestamptz,status text);
 create table analytics_events(id uuid primary key,session_id uuid,visitor_id text,event_type text,page_path text,created_at timestamptz default now(),order_id text,revenue numeric);
 insert into analytics_sessions(id,visitor_id,country,city,is_bot) values('10000000-0000-4000-8000-000000000001','one','AE','Dubai',false),('10000000-0000-4000-8000-000000000002','two','MY','Kuala Lumpur',false),('10000000-0000-4000-8000-000000000003','bot','US','Seattle',true);
 insert into analytics_events(id,session_id,event_type,page_path) select gen_random_uuid(),id,'page_view','/product/oud' from analytics_sessions;`);
    await db.exec(
      fs.readFileSync("supabase/migration_analytics_city_filter.sql", "utf8"),
    );
    let report = (
      await db.query(
        "select analytics_locations_city(now()-interval '1 day',now()+interval '1 day',false,false,'MY','','Kuala Lumpur') r",
      )
    ).rows[0].r;
    assert.equal(report.summary.visitors, 1);
    assert.equal(report.city_options.length, 1);
    assert.equal(report.city_options[0].city, "Kuala Lumpur");
    assert.equal(report.pages[0].views, 1);
    assert.equal(report.cities[0].country, "MY");
    assert.equal(report.summary.revenue, 0);
    report = (
      await db.query(
        "select analytics_locations_city(now()-interval '1 day',now()+interval '1 day') r",
      )
    ).rows[0].r;
    assert.equal(report.city_options.length, 2);
    assert.equal(
      report.city_options.some((c) => c.city === "Seattle"),
      false,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select analytics_locations_city(now(),now())"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
