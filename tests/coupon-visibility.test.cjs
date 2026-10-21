const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const vm=require('node:vm');const fs=require('node:fs');function load(user, rows=[{coupon_id:"once"},{coupon_id:"repeat"}]){const exports={};let scoped=false;vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/coupons/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>n==='next/server'?{NextResponse:Response}:n.endsWith('/store')?{getPublicCoupons:async()=>[{id:'once',usageLimit:1},{id:'repeat',usageLimit:4},{id:'fresh',usageLimit:1}]}:n.endsWith('/server')?{createClient:async()=>({auth:{getUser:async()=>({data:{user}})}})}:{createAdminClient:()=>({from:()=>({select:()=>({eq:async(k,id)=>{assert.equal(k,'user_id');assert.equal(id,user.id);scoped=true;return {data:rows}}})})})}});return {run:exports.GET,scoped:()=>scoped};}test('used one-time offer is hidden while reusable and unused offers remain',async()=>{const h=load({id:'customer'});const r=await h.run();assert.deepEqual((await r.json()).coupons.map(x=>x.id),['repeat','fresh']);assert.equal(h.scoped(),true);assert.equal(r.headers.get('cache-control'),'private, no-store')});test('guest cannot read redemption history',async()=>{const h=load(null);assert.equal((await (await h.run()).json()).coupons.length,3);assert.equal(h.scoped(),false)});

test('four-use limit remains visible at three uses and disappears at four',async()=>{
 const rows=n=>Array.from({length:n},()=>({coupon_id:'repeat'}));
 const below=await (await load({id:'customer'},rows(3)).run()).json();
 assert.ok(below.coupons.some(c=>c.id==='repeat'));
 const full=await (await load({id:'customer'},rows(4)).run()).json();
 assert.ok(!full.coupons.some(c=>c.id==='repeat'));
 const other=await (await load({id:'other-account'},[]).run()).json();
 assert.ok(other.coupons.some(c=>c.id==='repeat'));
});
