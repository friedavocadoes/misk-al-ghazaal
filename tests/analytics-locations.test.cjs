const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,mocks={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>{if(n in mocks)return mocks[n];throw Error(n);},URL,URLSearchParams,Response,Request,Headers});return exports;
}
const {analyticsLocation,uaeEmirate}=load('src/lib/analytics/location.ts');
test('edge location normalizes UAE region codes and encoded cities without guessing unknown emirates',()=>{
 for(const code of ['AZ','DU','SH','AJ','UQ','RK','FU'])assert.equal(uaeEmirate('AE-'+code,null),code);
 assert.equal(uaeEmirate('Abu Dhabi',null),'AZ');
 assert.equal(uaeEmirate(null,'Al Ain'),'AZ');
 assert.equal(uaeEmirate(null,'Dibba'),null);
 const geo=analyticsLocation(new Headers({'x-vercel-ip-country':'AE','x-vercel-ip-country-region':'DU','x-vercel-ip-city':'Dubai%20Marina'}));
 assert.equal(geo.country,'AE');assert.equal(geo.emirate,'DU');assert.equal(geo.city,'Dubai Marina');assert.equal(geo.location_source,'vercel');
 const unknown=analyticsLocation(new Headers());assert.equal(unknown.country,null);assert.equal(unknown.city,null);assert.equal(unknown.emirate,null);
 assert.equal(analyticsLocation(new Headers({'cf-ipcountry':'AE','cf-region':'Ras Al Khaimah','cf-ipcity':'Ras Al Khaimah'})).emirate,'RK');
 assert.equal(analyticsLocation(new Headers({'cf-ipcountry':'XX','cf-ipcity':'Dubai'})).city,null);
 assert.equal(analyticsLocation(new Headers({'cf-ipcountry':'US','cf-ipcity':'Dubai'})).emirate,null);
 const priority=analyticsLocation(new Headers({'x-vercel-ip-country':'US','cf-ipcountry':'AE','cf-region-code':'DU'}));assert.equal(priority.country,'US');assert.equal(priority.region,null);
 assert.doesNotThrow(()=>analyticsLocation(new Headers({'x-vercel-ip-country':'AE','x-vercel-ip-city':'Bad%encoding'})));
});

test('location endpoint validates filters and keeps role checks before database access',async()=>{
 let calls=0,args;
 const mocks={
  'next/server':{NextResponse:class extends Response{static json(body,init){return Response.json(body,init)}}},
  '@/lib/admin-auth':{getAdminSession:async()=>({role:'content_editor'})},
  '@/lib/supabase/service':{createAdminClient:()=>({rpc:async(name,params)=>{calls++;assert.equal(name,'analytics_locations_city');args=params;return{data:{summary:{}},error:null};}})},
  '@/lib/analytics/dashboard':load('src/lib/analytics/dashboard.ts'),
 };
 const route=load('src/app/api/admin/analytics/route.ts',mocks);
 const url='https://store.test/api/admin/analytics?kind=locations&start=2026-10-01&end=2026-10-02';
 assert.equal((await route.GET(new Request(url+'&country=AE&emirate=DU&bots=only'))).status,200);assert.equal(args.filter_country,'AE');assert.equal(args.filter_emirate,'DU');assert.equal(args.bots_only,true);
 assert.equal((await route.GET(new Request(url+'&country=US&emirate=DU'))).status,400);
 assert.equal((await route.GET(new Request(url+'&country=AE&emirate=bad'))).status,400);assert.equal(calls,1);
 const forbidden=load('src/app/api/admin/analytics/route.ts',{...mocks,'@/lib/admin-auth':{getAdminSession:async()=>({role:'orders'})},'@/lib/supabase/service':{createAdminClient:()=>{throw Error('must not access database')}}});
 assert.equal((await forbidden.GET(new Request(url))).status,403);
});

test('location migration, deduplication, geography filters, chronological page conversion and access', {skip:!process.env.ANALYTICS_PGLITE_MODULE}, async()=>{
 const {PGlite}=require(process.env.ANALYTICS_PGLITE_MODULE);const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,email text);
 create table profiles(id uuid primary key,full_name text,phone text,default_address jsonb,promo_opt_in bool,order_updates_opt_in bool,role text);
 create table orders(id uuid primary key,user_id uuid,status text,deleted_at timestamptz,created_at timestamptz,total numeric);`);
 await db.exec(fs.readFileSync('supabase/migration_analytics.sql','utf8'));
 const migration=fs.readFileSync('supabase/migration_analytics_locations.sql','utf8');await db.exec(migration);await db.exec(migration);
 const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
 const session=async(n,geo={})=>{await db.query('select ingest_analytics_event($1::jsonb,null)',[JSON.stringify({id:id(n),visitor_id:id(n),device_type:'mobile',...geo})]);await db.query("update analytics_sessions set created_at='2026-10-01T05:00:00Z' where id=$1",[id(n)]);};
 const event=async(n,type,path,time,revenue=null,order=null)=>{await db.query(`insert into analytics_events(session_id,visitor_id,event_type,page_path,created_at,revenue,order_id) values($1,$2,$3,$4,$5,$6,$7)`,[id(n),id(n),type,path,`2026-10-01T${time}:00Z`,revenue,order]);};
 await session(1,{country:'AE',region:'DU',emirate:'DU',city:'Dubai',location_source:'vercel'});
 await session(2,{country:'AE',region:'AZ',emirate:'AZ',city:'Abu Dhabi'});
 await session(3,{country:'AE',emirate:'DU',city:'Dubai',is_bot:true,bot_reason:'headless'});
 await session(4);await session(5,{country:'US',region:'NY',city:'New York'});
 await event(1,'page_view','/', '06:00');await event(1,'page_view','/product/oud','07:00');await event(1,'page_view','/product/oud','07:30');await event(1,'purchase','/checkout','08:00',189,'order-1');await event(1,'page_view','/after-order','09:00');
 await event(2,'page_view','/','06:00');await event(3,'page_view','/','06:00');await event(4,'page_view','/','06:00');await event(5,'page_view','/','06:00');
 const report=async(country='',emirate='',bots=false)=>(await db.query('select analytics_locations($1,$2,false,$3,$4,$5) as data',['2026-09-30T20:00:00Z','2026-10-02T20:00:00Z',bots,country,emirate])).rows[0].data;
 const all=await report();assert.equal(all.summary.visitors,4);assert.equal(all.summary.views,7);assert.equal(all.summary.orders,1);assert.equal(all.summary.revenue,189);assert.equal(all.summary.conversion_rate,25);assert.equal(all.summary.located_sessions,3);
 assert.equal(all.pages.find(p=>p.page_path==='/after-order').orders,0);assert.equal(all.pages.find(p=>p.page_path==='/product/oud').orders,1);assert.equal(all.pages.find(p=>p.page_path==='/product/oud').views,2);
 const dubai=await report('AE','DU');assert.equal(dubai.summary.visitors,1);assert.equal(dubai.summary.conversion_rate,100);assert.equal(dubai.pages.find(p=>p.page_path==='/').orders,1);
 assert.equal((await report('US')).summary.orders,0);assert.equal((await report('AE','FU')).summary.sessions,0);assert.equal((await report('AE','DU',true)).summary.visitors,1);
 // Do not combine a later US location with the original UAE session.
 await session(1,{country:'US',region:'NY',city:'New York'});
 let stored=(await db.query('select * from analytics_sessions where id=$1',[id(1)])).rows[0];assert.equal(stored.country,'AE');assert.equal(stored.city,'Dubai');
 // Missing legacy details fill from a later compatible request.
 await session(4,{country:'AE',region:'SH',emirate:'SH',city:'Sharjah'});
 stored=(await db.query('select * from analytics_sessions where id=$1',[id(4)])).rows[0];assert.equal(stored.emirate,'SH');
 const eventId=id(99),payload={id:eventId,event_type:'purchase',page_path:'/checkout',order_id:'server-order',revenue:50};
 for(let i=0;i<2;i++)await db.query('select ingest_analytics_event($1::jsonb,$2::jsonb)',[JSON.stringify({id:id(2),visitor_id:id(2),country:'AE'}),JSON.stringify(payload)]);
 assert.equal((await db.query("select count(*)::int as n from analytics_events where order_id='server-order'")).rows[0].n,1);
 await db.exec('set role authenticated');await assert.rejects(db.query("select analytics_locations(now()-interval '1 day',now())"));await assert.rejects(db.query('select city from analytics_sessions'));await db.exec('reset role');
 }finally{await db.close();}
});
