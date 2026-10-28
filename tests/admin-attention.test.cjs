const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),URL,Request,Response,console,...globals});return exports;}
const attention=load('src/lib/admin-attention.ts');const superId='10000000-0000-4000-8000-000000000001',ordersId='10000000-0000-4000-8000-000000000002',customerId='10000000-0000-4000-8000-000000000003',contentId='10000000-0000-4000-8000-000000000004';
const orderId='20000000-0000-4000-8000-000000000001',contactId='30000000-0000-4000-8000-000000000001',reviewId='40000000-0000-4000-8000-000000000001';
test('notification endpoints enforce staff roles, origin and typed read states before privileged mutations',async()=>{
 for(const role of [null,'customer','content_editor','orders','super_admin']){
 let calls=[];const route=load('src/app/api/admin/notifications/route.ts',{'next/server':require('next/server'),'@/lib/admin-auth':{getAdminSession:async()=>role?{role,userId:superId}:null},'@/lib/supabase/service':{createAdminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return{data:attention.EMPTY_ATTENTION,error:null}}})},'@/lib/admin-attention':attention,'@/lib/analytics/shared':{uuid:v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v)}});
 const get=await route.GET();assert.equal(get.status,['super_admin','orders'].includes(role)?200:403);
 const req=(body,origin='https://shop.test')=>new Request('https://shop.test/api/admin/notifications',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 calls=[];assert.equal((await route.POST(req({kind:'contact',id:contactId,read:true},'https://other.test'))).status,403);assert.equal(calls.length,0);
 if(['orders','super_admin'].includes(role)){
 assert.equal((await route.POST(req({kind:'contact',id:contactId,read:'yes'}))).status,400);assert.equal(calls.length,0);
 assert.equal((await route.POST(req({kind:'contact',id:contactId,read:true,staff_id:customerId}))).status,200);assert.equal(calls[0].args.p_actor,superId);
 assert.equal((await route.POST(req({kind:'review',id:reviewId,read:false}))).status,role==='super_admin'?200:403);
 }
 }
});
test('notification unread counts and inbox filters are per staff, role-aware, paginated and reversible',async t=>{
 if(!process.env.ANALYTICS_PGLITE_MODULE)return t.skip('Set ANALYTICS_PGLITE_MODULE');const {PGlite}=require(process.env.ANALYTICS_PGLITE_MODULE),db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,role text);
 create table orders(id uuid primary key,order_no text,customer_name text,total numeric,status text,deleted_at timestamptz,created_at timestamptz default now());
 create table contact_messages(id uuid primary key default gen_random_uuid(),reference text default 'MG-QA',topic text,email text,data jsonb,created_at timestamptz default now());
 create table products(id uuid primary key,title text);create table reviews(id uuid primary key,product_id uuid,rating int,body text,title text,approved boolean,created_at timestamptz default now());
 insert into profiles values('${superId}','super_admin'),('${ordersId}','orders'),('${customerId}','customer'),('${contentId}','content_editor');
 insert into orders(id,order_no,customer_name,total,status) values('${orderId}','MG-1','Samira',204,'new'),('20000000-0000-4000-8000-000000000002','MG-2','Omar',300,'confirmed');
 insert into orders(id,order_no,customer_name,total,status,deleted_at) values('20000000-0000-4000-8000-000000000003','MG-3','Noor',100,'new',now());
 insert into contact_messages(id,topic,email,data) values('${contactId}','meeting','samira@test','{"name":"Samira","message":"A private label project"}'),('30000000-0000-4000-8000-000000000002','review','omar@test','{"name":"Omar","message":"Lovely oud"}'),('30000000-0000-4000-8000-000000000003','complaint','noor@test','{"name":"Noor","message":"Delivery question"}');
 insert into reviews(id,rating,body,approved) values('${reviewId}',5,'A lovely scent',false),('40000000-0000-4000-8000-000000000002',4,'Approved already',true);`);
 await db.exec(fs.readFileSync('supabase/migration_admin_attention.sql','utf8'));await db.exec(fs.readFileSync('supabase/migration_admin_attention.sql','utf8'));
 const feed=async actor=>(await db.query('select admin_attention_feed($1) as result',[actor])).rows[0].result;
 const mark=(actor,kind,id,read)=>db.query('select admin_attention_mark($1,$2,$3,$4)',[actor,kind,id,read]);
 let result=await feed(superId);assert.equal(result.counts.total,5);assert.equal(result.counts.review,1);assert.equal((await feed(ordersId)).counts.total,4);assert.equal((await feed(ordersId)).items.some(item=>item.kind==='review'),false);
 for(const actor of [customerId,contentId])await assert.rejects(feed(actor),/Not authorized/);
 await mark(superId,'contact',contactId,true);assert.equal((await feed(superId)).counts.contact,2);assert.equal((await feed(ordersId)).counts.contact,3);
 let inbox=(await db.query("select admin_contact_inbox($1,'meeting','read','Samira',1) as result",[superId])).rows[0].result;assert.equal(inbox.total,1);assert.equal(inbox.rows[0].is_read,true);assert.equal('data' in inbox.rows[0],false);
 await mark(ordersId,'contact',contactId,true);await mark(superId,'contact',contactId,false);assert.equal((await feed(superId)).counts.contact,3);assert.equal((await feed(ordersId)).counts.contact,2);
 await assert.rejects(mark(ordersId,'review',reviewId,true),/Item unavailable/);await assert.rejects(mark(superId,'contact','90000000-0000-4000-8000-000000000001',true),/Item unavailable/);
 await mark(superId,'order',orderId,true);assert.equal((await feed(superId)).counts.order,0);await mark(superId,'order',orderId,false);assert.equal((await feed(superId)).counts.order,1);
 await db.exec(`update orders set status='confirmed' where id='${orderId}';update reviews set approved=true where id='${reviewId}'`);assert.equal((await feed(superId)).counts.order,0);assert.equal((await feed(superId)).counts.review,0);
 await db.exec(`insert into contact_messages(topic,email,data) select 'meeting','extra@test',jsonb_build_object('name','Extra','message',repeat('x',500)) from generate_series(1,40)`);
 const first=(await db.query("select admin_contact_inbox($1,'','all','',1) as result",[superId])).rows[0].result,second=(await db.query("select admin_contact_inbox($1,'','all','',2) as result",[superId])).rows[0].result;
 assert.equal(first.total,43);assert.equal(first.rows.length,30);assert.equal(second.rows.length,13);assert.equal(new Set([...first.rows,...second.rows].map(row=>row.id)).size,43);assert.ok(first.rows.every(row=>row.preview.length<=170));
 await assert.rejects(db.query("select admin_contact_inbox($1,'','all','',1)",[customerId]),/Not authorized/);
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from admin_attention_reads'),/permission denied/);await assert.rejects(db.query('select admin_attention_feed($1)',[superId]),/permission denied/);
 }finally{await db.close()}
});
