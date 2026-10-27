const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),URL,URLSearchParams,Request,Response,crypto:require('node:crypto').webcrypto,Event,console,...globals});return exports;}
const policy=load('src/lib/analytics/survey-policy.ts');
test('feedback suppresses checkout, account, recent orders and repeated invitations for meaningful cooldowns',()=>{
 const now=1e11;for(const [key,age] of [['shownAt',23*3600000],['dismissedAt',6*86400000],['answeredAt',29*86400000],['purchasedAt',6*86400000],['checkoutAt',3600000],['checkoutAttemptAt',23*3600000]])assert.equal(policy.surveyEligible(now,{[key]:now-age},false,false),false,key);
 assert.equal(policy.surveyEligible(now,{dismissedAt:now-8*86400000},false,false),true);
 for(const path of ['/checkout','/ar/checkout','/cart','/account/login','/ar/account/orders','/find-your-scent','/posts/test'])assert.equal(policy.surveyRouteAllowed(path),false,path);
 for(const path of ['/','/ar','/product/oud','/ar/collection/all','/search'])assert.equal(policy.surveyRouteAllowed(path),true,path);
});
test('purchase suppression survives denied storage and still broadcasts closure',()=>{
 const jar=new Map(),events=[];const document={referrer:''};Object.defineProperty(document,'cookie',{get:()=>[...jar].map(([k,v])=>k+'='+v).join('; '),set:s=>{const [pair]=s.split(';');const at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}});
 const globals={document,location:{href:'https://store.test/checkout',pathname:'/checkout',protocol:'https:'},localStorage:{getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')}},sessionStorage:{getItem:()=>{throw Error('denied')},setItem:()=>{throw Error('denied')}},window:{dispatchEvent:e=>events.push(e.type)}};
 const memory=load('src/lib/analytics/survey-memory.ts',{},globals);
 const client=load('src/lib/analytics/client.ts',{'./shared':load('src/lib/analytics/shared.ts'),'./survey-memory':memory},globals);
 client.markPurchase('MG-TEST');assert.ok(jar.has('misk-feedback-purchase'));assert.ok(memory.feedbackHistory().purchasedAt>0);assert.deepEqual(events,['analytics-purchased']);
});
test('haptic motifs are restrained, varied, flight-aligned and optional',()=>{
 const h=load('src/lib/haptics.ts');const total=pattern=>pattern.reduce((sum,v)=>sum+v.duration+(v.delay??0),0);
 assert.equal(total(h.HAPTIC_PATTERNS.flight),1250);assert.ok(new Set(Object.values(h.HAPTIC_PATTERNS).map(p=>JSON.stringify(p))).size>6);
 for(const [name,pattern] of Object.entries(h.HAPTIC_PATTERNS)){assert.ok(pattern.every(v=>v.duration<=35));if(name!=='order')assert.ok(pattern.every(v=>v.intensity<=.5));}
 assert.equal(h.hapticsEnabled('off',false),false);assert.equal(h.hapticsEnabled(null,true),false);assert.equal(h.hapticsEnabled('on',true),true);
 assert.equal(h.cartFeedbackKind(true,false),'flight');assert.equal(h.cartFeedbackKind(true,true),'add');
 assert.doesNotThrow(()=>h.haptic('order'));
});
test('haptic runtime ignores desktop/duplicate taps and cancels on hidden tabs',()=>{
 let now=100000,cancelled=0,destroyed=0,cleanup;const calls=[],listeners={};
 const h=load('src/lib/haptics.ts');class Clock extends Date{static now(){return now;}}
 const window={addEventListener:(n,fn)=>listeners[n]=fn,removeEventListener:()=>{}};
 const document={hidden:false,addEventListener:(n,fn)=>listeners[n]=fn,removeEventListener:()=>{}};
 const component=load('src/components/blocks/StorefrontHaptics.tsx',{'react':{useEffect:fn=>{cleanup=fn()}},'web-haptics':{WebHaptics:class{trigger(p){calls.push(p);return Promise.resolve()}cancel(){cancelled++}destroy(){destroyed++}}},'@/lib/haptics':h},{window,document,Date:Clock,matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null}});
 component.StorefrontHaptics();h.haptic('tick');assert.equal(calls.length,0);listeners.pointerdown({isTrusted:true,pointerType:'touch'});h.haptic('step');h.haptic('tick');assert.equal(calls.length,1);h.haptic('order');assert.equal(calls.length,2);now+=100;document.hidden=true;listeners.visibilitychange();h.haptic('tick');assert.equal(calls.length,2);assert.equal(cancelled,1);cleanup();assert.equal(destroyed,1);h.haptic('tick');assert.equal(calls.length,2);
});
test('survey eligibility API fails closed when unavailable',async()=>{
 const route=load('src/app/api/analytics/survey/route.ts',{'next/server':{NextResponse:class extends Response{static json(b,o){return Response.json(b,o)}}},'@/lib/analytics/survey-policy':policy,'@/lib/analytics/server':{sameOrigin:()=>true,analyticsSession:async()=>({id:'session',visitor_id:'visitor',is_bot:false})},'@/lib/supabase/service':{createAdminClient:()=>({rpc:async()=>({data:null,error:Error('migration missing')})})}});
 const response=await route.GET(new Request('https://store.test/api/analytics/survey'));assert.equal(response.status,503);assert.equal((await response.json()).allowed,false);assert.match(response.headers.get('cache-control'),/no-store/);
});

test('actual SQL: paid-only money across reports and cross-session purchaser suppression',{skip:!process.env.ANALYTICS_PGLITE_MODULE},async()=>{
 const {PGlite}=require(process.env.ANALYTICS_PGLITE_MODULE),db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);
 create table profiles(id uuid primary key,full_name text,phone text,default_address jsonb,promo_opt_in bool,order_updates_opt_in bool,role text);
 create table orders(id uuid primary key,user_id uuid,status text,deleted_at timestamptz,created_at timestamptz default now(),total numeric,payment_status text,order_no text,customer_name text,email text,phone text,payment_method text,tracking_no text);
 create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid,title text,qty int,created_at timestamptz default now());`);
 await db.exec(fs.readFileSync('supabase/migration_analytics.sql','utf8'));await db.exec(fs.readFileSync('supabase/migration_analytics_locations.sql','utf8'));const sql=fs.readFileSync('supabase/migration_paid_feedback.sql','utf8');await db.exec(sql);await db.exec(sql);
 const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`,start=new Date(Date.now()-86400000).toISOString(),end=new Date(Date.now()+86400000).toISOString();
 await db.query('insert into auth.users values($1,$2)',[id(99),'customer@example.test']);await db.query("insert into profiles(id,role,promo_opt_in,order_updates_opt_in) values($1,'customer',true,true)",[id(99)]);
 const rows=[['paid','new',189,false],['pending','new',100,false],['refunded','new',80,false],['partially_refunded','new',60,false],['paid','cancelled',50,false],['paid','returned',40,false],['paid','new',30,true]];
 for(let n=0;n<rows.length;n++){const [payment,status,total,binned]=rows[n];await db.query("insert into orders(id,user_id,status,total,payment_status,order_no,deleted_at) values($1,$2,$3,$4,$5,$6,$7)",[id(n+10),id(99),status,total,payment,'MG-'+n,binned?new Date():null]);
 const session={id:id(n+1),visitor_id:id(n+1),user_id:id(99),country:'AE',emirate:'DU',city:'Dubai'};
 await db.query('select ingest_analytics_event($1,$2)',[JSON.stringify(session),JSON.stringify({event_type:'page_view',page_path:'/product/oud'})]);
 await db.query('select ingest_analytics_event($1,$2)',[JSON.stringify(session),JSON.stringify({event_type:'purchase',order_id:id(n+10),page_path:'/checkout',revenue:999,metadata:{items:[{product_id:'oud',product_name:'Oud',price:100,quantity:1}]}})]);}
 const report=async()=>(await db.query('select analytics_report($1,$2) as data',[start,end])).rows[0].data;
 let analytics=await report();assert.equal(analytics.kpis.revenue,189);assert.equal(analytics.kpis.orders,7);assert.equal(analytics.products[0].total_revenue,100);
 const geo=(await db.query("select analytics_locations($1,$2,false,false,'AE','DU') as data",[start,end])).rows[0].data;assert.equal(geo.summary.revenue,189);assert.equal(geo.pages[0].revenue,189);
 const admin=(await db.query('select admin_orders_report() as data')).rows[0].data;assert.equal(admin.summary.value,189);assert.equal(admin.total,6);
 const customers=(await db.query("select analytics_customers($1,$2) as data",[start,end])).rows[0].data;assert.equal(customers.rows[0].spent,189);
 const allowed=async(sid,visitor,user=null,submitting=false)=>(await db.query('select analytics_survey_allowed($1,$2,$3,$4) as ok',[sid,visitor,user,submitting])).rows[0].ok;
 assert.equal(await allowed(id(200),id(200)),true);assert.equal(await allowed(id(200),id(200),id(99)),false);assert.equal(await allowed(id(200),id(1)),false);
 await db.query("insert into profiles(id,role) values($1,'super_admin')",[id(100)]);assert.equal(await allowed(id(200),id(200),id(100)),false);
 await db.query('select ingest_analytics_event($1,$2)',[JSON.stringify({id:id(303),visitor_id:id(303)}),JSON.stringify({event_type:'checkout_started',page_path:'/checkout'})]);assert.equal(await allowed(id(303),id(303)),false);
 const guest={id:id(201),visitor_id:id(201)};await db.query('select ingest_analytics_event($1,$2)',[JSON.stringify(guest),JSON.stringify({event_type:'survey_shown',page_path:'/'})]);assert.equal(await allowed(id(201),id(201)),false);assert.equal(await allowed(id(201),id(201),null,true),true);assert.equal(await allowed(id(202),id(201),null,true),false);
 await db.query("insert into analytics_abandonment_surveys(session_id,reason) values($1,'other')",[id(201)]);assert.equal(await allowed(id(201),id(201),null,true),false);
 await db.query("update orders set payment_status='refunded' where id=$1",[id(10)]);analytics=await report();assert.equal(analytics.kpis.revenue,0);assert.equal(analytics.products[0].total_revenue,0);assert.equal(analytics.kpis.orders,7);
 await db.exec('set role anon');await assert.rejects(db.query('select analytics_survey_allowed(null,null)'));await assert.rejects(db.query('select admin_orders_report()'));await db.exec('reset role');
 }finally{await db.close();}
});
