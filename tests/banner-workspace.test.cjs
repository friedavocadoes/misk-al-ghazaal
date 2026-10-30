const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),FormData,console,...globals});return exports;}
const config=load('src/lib/banner-config.ts');
test('storefront banner query selects only enabled placement rows and bounds menu results in SQL',async()=>{
 const store=fs.readFileSync('src/lib/store.ts','utf8'),start=store.indexOf('async function getBannersBySlot'),end=store.indexOf('export async function getHeroSlides',start);
 let calls=[];const query={select(fields){calls.push(['select',fields]);return this},eq(k,v){calls.push(['eq',k,v]);return this},is(k,v){calls.push(['is',k,v]);return this},order(k){calls.push(['order',k]);return this},limit(n){calls.push(['limit',n]);return Promise.resolve({data:[],error:null})}};
 const exports={};vm.runInNewContext(ts.transpileModule(store.slice(start,end)+'\nexports.read=getBannersBySlot;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,BANNER_PLACEMENTS:config.BANNER_PLACEMENTS,requireConfigured(){},createClient:async()=>({from(table){assert.equal(table,'banners');return query}}),toBanner:row=>row});
 await exports.read('navigation');assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='slot'&&c[2]==='navigation'));assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='is_active'&&c[2]===true));assert.ok(calls.some(c=>c[0]==='is'&&c[1]==='deleted_at'&&c[2]===null));assert.ok(calls.some(c=>c[0]==='limit'&&c[1]===2));
 calls=[];const previous=config.BANNER_PLACEMENTS.brand.enabled;config.BANNER_PLACEMENTS.brand.enabled=false;try{await exports.read('brand');assert.equal(calls.length,0);}finally{config.BANNER_PLACEMENTS.brand.enabled=previous;}
});
test('responsive SafeImage follows a changed source and scopes failures to the old source',()=>{
 let failed=null;const {SafeImage}=load('src/components/ui/safe-image.tsx',{'react':{useState:()=>[failed,value=>{failed=value}]},'next/image':()=>{}});
 const base={src:'/desktop.webp',fallback:'/desktop-fallback.webp',alt:'Art'};
 let rendered=SafeImage(base);assert.equal(rendered.props.src,'/desktop.webp');rendered.props.onError();assert.equal(SafeImage(base).props.src,'/desktop-fallback.webp');assert.equal(SafeImage({...base,src:'/mobile.webp',fallback:'/mobile-fallback.webp'}).props.src,'/mobile.webp');
});
test('empty hero renders no media and announces availability for the solid header fallback',async()=>{
 const effects=[],events=[];const {HeroSlider}=load('src/components/sections/HeroSlider.tsx',{
  'react':{useState:value=>[value,()=>{}],useRef:value=>({current:value}),useEffect:effect=>effects.push(effect)},
  'next-intl':{useLocale:()=> 'en',useTranslations:()=>key=>key},'@/i18n/navigation':{Link:()=>{}},'@/components/ui/safe-image':{SafeImage:()=>{}},'@/lib/i18n':{tx:text=>text},
 },{window:{dispatchEvent:event=>events.push(event.type)},Event,queueMicrotask});
 const result=HeroSlider({slides:[]});assert.equal(result.type,'span');assert.equal(result.props.hidden,true);assert.equal(result.props['data-home-no-hero'],true);const cleanup=effects[0]();assert.deepEqual(events,['home-hero-availability']);cleanup();await Promise.resolve();assert.deepEqual(events,['home-hero-availability','home-hero-availability']);
});
test('banner placements stay explicit and video classification handles URL suffixes',()=>{
 assert.equal(config.isBannerPlacement('hero'),true);assert.equal(config.isBannerPlacement('brand'),true);assert.equal(config.isBannerPlacement('navigation'),true);
 for(const value of ['all','constructor','__proto__',null])assert.equal(config.isBannerPlacement(value),false);
 assert.equal(config.bannerIsVideo('https://cdn.test/film.MP4?x=1'),true);assert.equal(config.bannerIsVideo('/film.webm#start'),true);assert.equal(config.bannerIsVideo('/image.webp'),false);
});
test('all banner mutations authorize before database work; copy save cannot overwrite media, order or visibility',async()=>{
 let role='orders',reads=0,updated;
 const row={id:'banner-id',title:'Test',slot:'hero'};
 const builder={select(){return this},eq(){return this},is(){return this},single:async()=>({data:row,error:null}),update(value){updated=value;return this},then(resolve){resolve({error:null})}};
 const actions=load('src/app/admin/banners/actions.ts',{
  'sharp':()=>{},'@/lib/banner-storage':{cleanupBannerArt:async()=>{}},'next/cache':{revalidatePath:()=>{}},
  '@/lib/admin-auth':{getAdminSession:async()=>role?{role,userId:'staff'}:null},'@/lib/supabase/server':{createClient:async()=>{reads++;return{from:()=>builder}}},
  '@/lib/revalidate':{revalidateHome:()=>{}},'@/lib/audit':{logAdmin:async()=>{}},'@/lib/banner-config':config,
 });
 for(const unauthorized of [null,'orders','content_editor','customer']){role=unauthorized;
  for(const call of [()=>actions.createBanner(new FormData()),()=>actions.moveToBin(new FormData()),()=>actions.saveBanner(new FormData()),()=>actions.setBannerEnabled('id',true),()=>actions.reorderBanners('hero',[],[]),()=>actions.saveBannerMedia('id','mobile','','')])await assert.rejects(call,/Not authorized/);
 }
 assert.equal(reads,0);role='super_admin';const form=new FormData();form.set('id','banner-id');form.set('title','New heading');form.set('sort','900');form.set('is_active','false');form.set('src','https://bad.test/replace.webp');
 await actions.saveBanner(form);assert.equal(updated.title,'New heading');for(const forbidden of ['sort','is_active','src','mobile_src','slot'])assert.equal(Object.hasOwn(updated,forbidden),false);
 await actions.setBannerEnabled('banner-id',false);assert.equal(updated.is_active,false);
});
test('banner SQL reorders a complete placement atomically, rejects stale or foreign IDs and hides disabled rows publicly',async t=>{
 if(!process.env.ANALYTICS_PGLITE_MODULE)return t.skip('Set ANALYTICS_PGLITE_MODULE');
 const {PGlite}=require(process.env.ANALYTICS_PGLITE_MODULE),db=new PGlite();const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table profiles(id uuid primary key,role text);insert into profiles values('${id(99)}','super_admin'),('${id(98)}','orders');
   create function public.is_super_admin(who uuid) returns boolean language sql security definer stable as $$select exists(select 1 from profiles where id=who and role='super_admin')$$;
   create table banners(id uuid primary key,slot text,sort integer,deleted_at timestamptz);
   alter table banners enable row level security;grant select on banners to anon,authenticated;
   create policy "public read banners" on banners for select using(true);
   create policy "super_admin write banners" on banners for all using(public.is_super_admin(auth.uid())) with check(public.is_super_admin(auth.uid()));
   insert into banners values('${id(1)}','hero',8,null),('${id(2)}','hero',12,null),('${id(3)}','brand',7,null),('${id(4)}','hero',50,now());`);
  const sql=fs.readFileSync('supabase/migration_banner_workspace.sql','utf8');await db.exec(sql);await db.exec(sql);
  await db.query('update banners set is_active=false where id=$1',[id(2)]);
  await db.exec(`set role anon`);const publicRows=(await db.query('select id from banners order by id')).rows;assert.deepEqual(publicRows.map(r=>r.id),[id(1),id(3)]);
  await assert.rejects(db.query('select reorder_banners($1,$2,$3)',['hero',[id(2),id(1)],[id(1),id(2)]]));
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(98)]);await db.exec('set role authenticated');
  await assert.rejects(db.query('select reorder_banners($1,$2,$3)',['hero',[id(2),id(1)],[id(1),id(2)]]),/Not authorized/);
  await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(99)]);await db.exec('set role authenticated');
  const reorder=(ids,expected)=>db.query('select reorder_banners($1,$2,$3)',['hero',ids,expected]);
  await assert.rejects(reorder([id(1),id(1)],[id(1),id(2)]),/exactly once/);
  await assert.rejects(reorder([id(1),id(3)],[id(1),id(2)]),/exactly once/);
  await assert.rejects(reorder([id(2)],[id(1),id(2)]),/exactly once/);
  await reorder([id(2),id(1)],[id(1),id(2)]);
  const rows=(await db.query("select id,sort from banners where slot='hero' and deleted_at is null order by sort,id")).rows;
  assert.deepEqual(rows,[{id:id(2),sort:1},{id:id(1),sort:2}]);
  await assert.rejects(reorder([id(1),id(2)],[id(1),id(2)]),/another window/);
  assert.equal((await db.query('select sort from banners where id=$1',[id(3)])).rows[0].sort,1);
 }finally{await db.close();}
});
