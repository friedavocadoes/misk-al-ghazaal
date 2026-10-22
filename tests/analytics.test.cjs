const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(name in mocks)return mocks[name];throw Error('Unexpected import '+name);},URL,URLSearchParams,Response,Request,crypto:require('node:crypto').webcrypto,Blob,console});return exports;}
const shared=load('src/lib/analytics/shared.ts');
test('attribution captures campaign and only an external referrer domain',()=>{
 const touch=shared.attributionFromUrl(new URL('https://store.test/product/oud?utm_source=instagram&utm_medium=reel&utm_campaign=launch&ref=friend'),'https://google.com/search?q=private');
 assert.equal(touch.source,'instagram');assert.equal(touch.referrer,'google.com');assert.equal(touch.landing_page,'/product/oud');assert.equal(touch.ref,'friend');
 assert.equal(shared.attributionFromUrl(new URL('https://store.test/'),'https://store.test/cart').referrer,undefined);
});
test('bot signatures and URL sanitization',()=>{
 for(const ua of ['Googlebot','GPTBot','curl/8','HeadlessChrome','facebookexternalhit','WhatsApp'])assert.ok(shared.botReason(ua));
 assert.equal(shared.botReason('Mozilla/5.0 Chrome/130 Safari/537.36'),null);
 assert.equal(shared.safePath('/checkout?email=private@example.com#step'),'/checkout');
});
test('Excel CSV neutralizes formula injection and escapes text',()=>{
 for(const value of ['=HYPERLINK("x")',' +SUM(1)','@function','-1','\t=SUM(1)'])assert.ok(shared.csvCell(value).startsWith('"\''));
 assert.equal(shared.csvCell('A "quote"'),'"A ""quote"""');
});
test('ranges are inclusive Dubai calendar days and reject oversized/reversed windows',()=>{
 const {analyticsRange}=load('src/lib/analytics/dashboard.ts');
 const range=analyticsRange(new URLSearchParams('start=2026-10-22&end=2026-10-22'));
 assert.equal(range.start_date,'2026-10-21T20:00:00.000Z');assert.equal(range.end_date,'2026-10-22T20:00:00.000Z');
 assert.throws(()=>analyticsRange(new URLSearchParams('start=2026-10-23&end=2026-10-22')));
 assert.throws(()=>analyticsRange(new URLSearchParams('start=2020-01-01&end=2026-10-22')));
});
test('collector rejects client purchase events, ignores failures, and schedules writes after response',async()=>{
 let called=0;const pending=[];
 const route=load('src/app/api/analytics/collect/route.ts',{
  'next/server':{NextResponse:Response,after:fn=>pending.push(fn)},
  '@/lib/supabase/service':{createAdminClient:()=>({rpc:async()=>{called++}})},
  '@/lib/analytics/shared':shared,
  '@/lib/analytics/server':{sameOrigin:()=>true,readSmallBody:r=>r.json(),analyticsSession:async()=>({id:'session',visitor_id:'visitor'})},
 });
 const post=body=>route.POST(new Request('https://store.test/api/analytics/collect',{method:'POST',body:JSON.stringify(body)}));
 assert.equal((await post({event_type:'purchase',order_id:'fake',revenue:999})).status,204);assert.equal(pending.length,0);
 assert.equal((await post({event_type:'page_view',page_path:'/'})).status,204);assert.equal(called,0);await pending.pop()();assert.equal(called,1);
 assert.equal((await route.POST(new Request('https://store.test/api/analytics/collect',{method:'POST',body:'broken json'}))).status,204);
});
test('customer analytics and exports reject content editors before service access',async()=>{
 const route=load('src/app/api/admin/analytics/route.ts',{'next/server':{NextResponse:class extends Response{static json(value,init){return Response.json(value,init)}}},'@/lib/admin-auth':{getAdminSession:async()=>({role:'content_editor'})},'@/lib/supabase/service':{createAdminClient:()=>({})},'@/lib/analytics/dashboard':load('src/lib/analytics/dashboard.ts')});
 assert.equal((await route.GET(new Request('https://store.test/api/admin/analytics?kind=customers'))).status,403);
 const exporter=load('src/app/api/admin/analytics/export/route.ts',{'@/lib/admin-auth':{getAdminSession:async()=>({role:'content_editor'})},'@/lib/supabase/service':{createAdminClient:()=>{throw Error('must not access data')}},'@/lib/analytics/dashboard':{},'@/lib/analytics/shared':shared,'@/lib/audit':{}});
 assert.equal((await exporter.GET(new Request('https://store.test/api/admin/analytics/export'))).status,403);
});

test('campaign cookies remain under browser size limits for non-Latin names',()=>{
 const text=shared.attributionCookie({source:'عطر'.repeat(200),medium:'香水'.repeat(200),campaign:'موسم'.repeat(200),content:'香水'.repeat(200),term:'عطر'.repeat(200)});
 assert.ok(encodeURIComponent(text).length<=3000);assert.ok(JSON.parse(text).source);
});
test('proxy retains visitor and first touch while rolling session and updating campaign',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const values={_av_id:id,_as_id:id,_utm_first:'original',_utm_last:'old'};const written={};
 const {analyticsCookies}=load('src/lib/analytics/proxy.ts',{'./shared':shared});
 const req={nextUrl:new URL('https://store.test/?utm_source=tiktok'),headers:new Headers({'user-agent':'Googlebot'}),cookies:{get:k=>values[k]?{value:values[k]}:undefined,has:k=>k in values}};
 const response={cookies:{set:(key,value,options)=>{written[key]={value,...options};}}};
 analyticsCookies(req,response);
 assert.equal(written._av_id,undefined);assert.equal(written._utm_first,undefined);
 assert.equal(written._as_id.value,id);assert.equal(written._as_id.maxAge,1800);assert.equal(written._is_bot.value,'1');
 assert.equal(JSON.parse(written._utm_last.value).source,'tiktok');
});
