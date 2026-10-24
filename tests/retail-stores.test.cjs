const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const model={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/retail-store-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:model,URL,encodeURIComponent});
test('all-product stores include future products; selected stores and exceptions follow explicit choices',()=>{
 assert.equal(model.carriesProduct({active:true,all_products:true}),true);
 assert.equal(model.carriesProduct({active:true,all_products:true},{available:false}),false);
 assert.equal(model.carriesProduct({active:true,all_products:false}),false);
 assert.equal(model.carriesProduct({active:true,all_products:false},{available:true}),true);
 assert.equal(model.carriesProduct({active:false,all_products:true},{available:true}),false);
});
test('maps use trusted links or an encoded address fallback',()=>{
 for(const url of ['https://www.google.com/maps/place/Mamzar','https://maps.app.goo.gl/example','https://goo.gl/maps/example','https://maps.google.com/?q=Mamzar'])assert.equal(model.validGoogleMapsUrl(url),true,url);
 for(const url of ['javascript:alert(1)','http://google.com/maps/','https://google.com.evil.test/maps/','https://user@google.com/maps/','https://example.test','https://www.google.com/search?q=store'])assert.equal(model.validGoogleMapsUrl(url),false,url);
 const store={name:'Misk & Oud',address:'Shop 08',location:'Dubai',maps_url:''};
 const url=new URL(model.storeMapUrl(store));assert.equal(url.hostname,'www.google.com');assert.match(url.searchParams.get('query'),/Misk & Oud, Shop 08, Dubai/);
 assert.equal(model.storeMapUrl({...store,maps_url:'javascript:alert(1)'}),model.storeMapUrl(store));
});
const modulePath=process.env.ANALYTICS_PGLITE_MODULE;
test('stockist migration seeds once, enforces roles and updates assignments atomically',{skip:!modulePath},async()=>{
 const {PGlite}=require(modulePath);const db=new PGlite();
 try{
 const admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',customer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',store='c4000000-0000-4000-8000-000000000001',p1='10000000-0000-4000-8000-000000000001',p2='10000000-0000-4000-8000-000000000002';
 await db.exec(`create role anon;create role authenticated;create schema auth;grant usage on schema auth to anon,authenticated;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function public.is_super_admin(uid uuid) returns boolean language sql stable as $$select coalesce(uid='${admin}'::uuid,false)$$;
 create table products(id uuid primary key,title text,deleted_at timestamptz);
 insert into products values('${p1}','Oud',null),('${p2}','Musk',null);`);
 const sql=fs.readFileSync('supabase/migration_retail_stores.sql','utf8');await db.exec(sql);
 await db.query("update retail_stores set name='Edited Mamzar' where id=$1",[store]);await db.exec(sql);
 assert.equal((await db.query('select * from retail_stores')).rows.length,1);assert.equal((await db.query('select name from retail_stores')).rows[0].name,'Edited Mamzar');
 await db.exec('set role anon');assert.equal((await db.query('select * from retail_stores')).rows.length,1);
 await assert.rejects(db.query("update retail_stores set name='Forbidden'"));await assert.rejects(db.query('select assign_retail_store($1,$2,true)',[store,[p1]]));
 await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[customer]);
 await assert.rejects(db.query('select assign_retail_store($1,$2,true)',[store,[p1]]),/Administrator access/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 await db.query('select assign_retail_store($1,$2,false)',[store,[p1,p2]]);await db.query('select assign_retail_store($1,$2,false)',[store,[p1,p2]]);
 assert.equal((await db.query('select * from product_retail_stores')).rows.length,2);
 await assert.rejects(db.query('select assign_retail_store($1,$2,true)',[store,[p1,'99999999-9999-4999-8999-999999999999']]),/no longer available/);
 assert.equal((await db.query('select available from product_retail_stores where product_id=$1',[p1])).rows[0].available,false);
 await db.query('select assign_retail_store($1,$2,true)',[store,[p1]]);
 const available=async(id)=>(await db.query('select s.id from retail_stores s left join product_retail_stores p on p.store_id=s.id and p.product_id=$1 where s.active and coalesce(p.available,s.all_products)',[id])).rows;
 assert.equal((await available(p1)).length,1);assert.equal((await available(p2)).length,0);
 await db.exec('reset role');const future='10000000-0000-4000-8000-000000000003';await db.query("insert into products values($1,'New perfume',null)",[future]);assert.equal((await available(future)).length,1);
 await db.query('update retail_stores set active=false where id=$1',[store]);
 await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');assert.equal((await db.query('select * from retail_stores')).rows.length,0);assert.equal((await db.query('select * from product_retail_stores')).rows.length,0);
 await db.exec('reset role');await db.query('delete from retail_stores where id=$1',[store]);assert.equal((await db.query('select * from product_retail_stores')).rows.length,0);
 }finally{await db.close();}
});
