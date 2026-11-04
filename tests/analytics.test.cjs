const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(path,mocks={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(name in mocks)return mocks[name];throw Error('Unexpected import '+name);},URL,URLSearchParams,Response,Request,crypto:require('node:crypto').webcrypto,Blob,console});return exports;}
const shared=load('src/lib/analytics/shared.ts');
const consent=load('src/lib/analytics/consent.ts');
const production={'./environment':{analyticsCollectionEnabled:()=>true}};
test('attribution captures campaign and only an external referrer domain',()=>{
 const touch=shared.attributionFromUrl(new URL('https://store.test/product/oud?utm_source=instagram&utm_medium=reel&utm_campaign=launch&ref=friend'),'https://google.com/search?q=private');
 assert.equal(touch.source,'instagram');assert.equal(touch.referrer,'google.com');assert.equal(touch.landing_page,'/product/oud');assert.equal(touch.ref,'friend');
 assert.equal(shared.attributionFromUrl(new URL('https://store.test/'),'https://store.test/cart').referrer,undefined);
});
test('bot signatures and URL sanitization',()=>{
 for(const ua of ['Googlebot','GPTBot','curl/8','HeadlessChrome','facebookexternalhit','WhatsApp'])assert.ok(shared.botReason(ua));
 assert.equal(shared.botReason('Mozilla/5.0 Chrome/130 Safari/537.36'),null);
 assert.equal(shared.botReason('Mozilla/5.0 (Linux; Android 13; CUBOT KingKong) Chrome/130'),null);
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
  '@/lib/demand-ranking':{refreshDemandRanking:async()=>{}},
  'next/server':{NextResponse:Response,after:fn=>pending.push(fn)},
  '@/lib/supabase/service':{createAdminClient:()=>({rpc:async()=>{called++;return {error:null}}})},
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
test('proxy runs without a saved choice and retains visitor and first touch',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const values={_av_id:id,_as_id:id,_utm_first:'original',_utm_last:'old'};const written={};
 const {analyticsCookies}=load('src/lib/analytics/proxy.ts',{'./shared':shared,'./consent':consent,...production});
 const req={nextUrl:new URL('https://store.test/?utm_source=tiktok'),headers:new Headers({'user-agent':'Googlebot'}),cookies:{get:k=>values[k]?{value:values[k]}:undefined,has:k=>k in values}};
 const response={cookies:{set:(key,value,options)=>{written[key]={value,...options};}}};
 analyticsCookies(req,response);
 assert.equal(written._av_id,undefined);assert.equal(written._utm_first,undefined);
 assert.equal(written._as_id.value,id);assert.equal(written._as_id.maxAge,1800);assert.equal(written._is_bot,undefined);
 assert.equal(JSON.parse(written._utm_last.value).source,'tiktok');
});

test('proxy expires analytics identifiers after an essential-only choice', () => {
 const {analyticsCookies}=load('src/lib/analytics/proxy.ts',{'./shared':shared,'./consent':consent,...production});
 for(const choice of ['essential']){
  const values={_av_id:'legacy',_utm_first:'legacy',[consent.PRIVACY_COOKIE]:choice};
  const req={nextUrl:new URL('https://store.test/?utm_source=campaign'),headers:new Headers(),cookies:{get:key=>({value:values[key]}),has:key=>values[key]!==undefined}};
  const writes=[];
  const response={cookies:{set:(key,value,options)=>writes.push([key,value,options.maxAge])}};
  assert.equal(analyticsCookies(req,response),response);
  assert.deepEqual(writes,[['_av_id','',0],['_utm_first','',0]]);
 }
});

test('essential-only choice blocks attribution and location lookup even with analytics cookies', async () => {
 const id='11111111-1111-4111-8111-111111111111';
 const values={_av_id:id,_as_id:id};
 const unexpected=()=>assert.fail('Essential-only choice must block analytics');
 const {analyticsSession}=load('src/lib/analytics/server.ts',{
  'server-only':{},'./consent':consent,'./shared':shared,...production,
  '@/lib/demand-ranking':{},'@/lib/supabase/service':{},
  'next/headers':{cookies:async()=>({get:key=>({value:values[key]})})},
  '@/lib/supabase/server':{createClient:unexpected},'./ip-location':{resolveAnalyticsLocation:unexpected},
 });
 for(const choice of ['essential']){
  values[consent.PRIVACY_COOKIE]=choice;
  assert.equal(await analyticsSession(new Request('https://store.test/api/analytics/collect')),null);
 }
});

test('declined client analytics neither creates an identity nor sends a beacon', () => {
 const unexpected=()=>assert.fail('Analytics is disabled');
 const {trackEvent,ensureAnalyticsIdentity,markPurchase}=load('src/lib/analytics/client.ts',{
  './consent-client':{browserPrivacyChoice:()=> 'essential'},
  './shared':shared,'./survey-memory':{rememberPurchase:unexpected},
 });
 assert.equal(ensureAnalyticsIdentity(),'');
 assert.doesNotThrow(()=>trackEvent('page_view'));
 markPurchase('MG-TEST');
});

test('preview and development do not collect production analytics unless explicitly enabled', () => {
 const source=fs.readFileSync('src/lib/analytics/environment.ts','utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const enabled=(env,hostname)=>{const exports={};vm.runInNewContext(output,{exports,process:{env}});return exports.analyticsCollectionEnabled(hostname);};
 assert.equal(enabled({NODE_ENV:'development'}),false);
 assert.equal(enabled({NODE_ENV:'production',VERCEL_ENV:'preview'}),false);
 assert.equal(enabled({NODE_ENV:'production',VERCEL_ENV:'production'}),true);
 assert.equal(enabled({NODE_ENV:'production'},'localhost'),false);
 assert.equal(enabled({NODE_ENV:'development',ANALYTICS_ENABLE_NON_PRODUCTION:'1'}),true);
});

test('staff traffic is excluded and an old bot cookie cannot classify a shopper', async () => {
 const id='11111111-1111-4111-8111-111111111111';
 let role='super_admin', lookups=0;
 const profile={select:()=>profile,eq:()=>profile,maybeSingle:async()=>({data:{role}})};
 const {analyticsSession}=load('src/lib/analytics/server.ts',{
  'server-only':{},'./consent':consent,'./shared':shared,...production,
  '@/lib/demand-ranking':{},'@/lib/supabase/service':{},
  'next/headers':{cookies:async()=>({get:key=>({value:{_av_id:id,_as_id:id,_is_bot:'1'}[key]})})},
  '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:{id}}})},from:()=>profile})},
  './ip-location':{resolveAnalyticsLocation:async()=>{lookups++;return {};}},
 });
 const request=new Request('https://store.test/api/analytics/collect',{headers:{'user-agent':'Mozilla/5.0 Chrome/130'}});
 assert.equal(await analyticsSession(request),null);
 assert.equal(lookups,0);
 role='customer';
 assert.equal((await analyticsSession(request)).is_bot,false);
 assert.equal((await analyticsSession(request,true)).bot_reason,'webdriver_detected');
});
