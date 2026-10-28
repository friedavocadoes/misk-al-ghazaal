const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),URL,Request,Response,console,...globals});return exports;}
const shared=load('src/lib/order-access-shared.ts'),analytics=load('src/lib/analytics/shared.ts'),contact=load('src/lib/contact-message.ts');
const key='a'.repeat(64);
test('opaque order keys are validated, cookie memory bounded, analytics paths and attribution redact links',()=>{
 for(const value of ['', 'a'.repeat(63),'A'.repeat(64),'../../order','1'])assert.equal(shared.validOrderToken(value),false);
 assert.equal(shared.orderAccessPath(key),'/orders/'+key);assert.throws(()=>shared.orderAccessPath('bad'));
 assert.equal(shared.rememberedOrderTokens(JSON.stringify([...Array.from({length:10},(_,i)=>String(i).repeat(64)),key,key])).length,8);assert.equal(shared.rememberedOrderTokens('malformed').length,0);
 for(const locale of ['', '/ar','/en']){assert.equal(analytics.privateOrderPath(locale+'/orders/'+key),true);assert.equal(analytics.safePath(locale+'/orders/'+key),'/orders/[private]');assert.equal(Object.keys(analytics.attributionFromUrl(new URL('https://shop.test'+locale+'/orders/'+key+'?utm_source=email'),'' )).length,0)}assert.equal(analytics.privateOrderPath('/account/orders'),false);
});
test('contact validator strips unknown fields and validates every enquiry type',()=>{
 const base={topic:'meeting',name:' Samira ',email:'USER@EXAMPLE.TEST',message:' A project ',category:'Perfume',unexpected:'drop'};
 const result=contact.contactMessage(base);assert.equal(result.email,'user@example.test');assert.equal(result.name,'Samira');assert.equal('unexpected' in result,false);
 for(const patch of [{topic:'unknown'},{email:'bad'},{message:''},{message:'x'.repeat(5001)},{category:''},{topic:'review',product:'oud',rating:7},{topic:'complaint',complaintType:''}])assert.throws(()=>contact.contactMessage({...base,...patch}));
 assert.equal(contact.contactMessage({...base,topic:'review',product:'oud',rating:5}).rating,5);
});
test('guest claims protect owners, verified identity, staff previews, cancellations; contact submissions throttle atomically',async t=>{
 if(!process.env.ANALYTICS_PGLITE_MODULE)return t.skip('Set ANALYTICS_PGLITE_MODULE');const {PGlite}=require(process.env.ANALYTICS_PGLITE_MODULE),db=new PGlite();
 const customer='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',staff='10000000-0000-4000-8000-000000000003',unverified='10000000-0000-4000-8000-000000000004',order='20000000-0000-4000-8000-000000000001';
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function gen_random_bytes(int) returns bytea language sql as $$select decode(repeat(replace(gen_random_uuid()::text,'-',''),2),'hex')$$;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create table profiles(id uuid primary key,role text);
 create table orders(id uuid primary key,user_id uuid,email text,status text default 'new',deleted_at timestamptz);
 insert into auth.users values('${customer}','customer@test',now()),('${other}','other@test',now()),('${staff}','staff@test',now()),('${unverified}','customer@test',null);
 insert into profiles values('${customer}','customer'),('${other}','customer'),('${staff}','super_admin'),('${unverified}','customer');
 insert into orders(id,email) values('${order}','CUSTOMER@test');`);
 await db.exec(fs.readFileSync('supabase/migration_guest_order_links.sql','utf8'));
 const token=(await db.query('select token from order_access_links')).rows[0].token;assert.match(token,/^[a-f0-9]{64}$/);
 await db.exec(fs.readFileSync('supabase/migration_guest_order_links.sql','utf8'));assert.equal((await db.query('select token from order_access_links')).rows[0].token,token);
 await db.exec(`update orders set status='cancelled' where id='${order}'`);assert.equal((await db.query('select count(*)::int as n from order_access_links where token=$1',[token])).rows[0].n,1);
 assert.equal((await db.query('select claim_browser_orders($1,$2) as n',[staff,[token]])).rows[0].n,0);assert.equal((await db.query('select claim_verified_email_orders($1) as n',[unverified])).rows[0].n,0);
 assert.equal((await db.query('select claim_browser_orders($1,$2) as n',[customer,[token]])).rows[0].n,1);assert.equal((await db.query('select claim_browser_orders($1,$2) as n',[other,[token]])).rows[0].n,0);
 assert.equal((await db.query('select user_id from orders where id=$1',[order])).rows[0].user_id,customer);
 const binned='20000000-0000-4000-8000-000000000002';await db.exec(`insert into orders(id,email,deleted_at) values('${binned}','other@test',now())`);assert.equal((await db.query('select claim_verified_email_orders($1) as n',[other])).rows[0].n,0);
 await db.exec(fs.readFileSync('supabase/migration_contact_inbox.sql','utf8'));
 const message={topic:'meeting',email:'client@test',name:'Client',category:'Perfume',message:'A project'};
 for(let i=0;i<3;i++)assert.match((await db.query('select submit_contact_message($1,$2) as ref',[customer,message])).rows[0].ref,/^MG-[A-F0-9]+$/);
 await assert.rejects(db.query('select submit_contact_message($1,$2)',[other,message]),/Please wait/);
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from order_access_links'),/permission denied/);await assert.rejects(db.query('select claim_browser_orders($1,$2)',[customer,[token]]),/permission denied/);await assert.rejects(db.query('select * from contact_messages'),/permission denied/);
 }finally{await db.close()}
});

test('order access endpoint rejects cross-site calls and keeps staff previews and owned orders out of browser claims',async()=>{
 for(const mode of ['guest','customer','staff','other-owner','race','binned','invalid','cross-site']){
  let remembered=0,claims=0,lookups=0;const id='customer';let owner=mode==='other-owner'?'another':null;
  const db={from:table=>{lookups++;const q={select(){return q},eq(){return q},single:async()=>read(),maybeSingle:async()=>read()};function read(){return{error:null,data:table==='order_access_links'?{order_id:'order'}:table==='profiles'?{role:mode==='staff'?'super_admin':'customer'}:{user_id:owner,deleted_at:mode==='binned'?'2026-01-01':null}}}return q}};
  const endpoint=load('src/app/api/orders/access/route.ts',{'next/server':require('next/server'),'@/lib/supabase/service':{createAdminClient:()=>db},'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:mode==='guest'?null:{id}}})}})},'@/lib/order-access':{rememberOrderAccess:async()=>{remembered++},claimRememberedOrders:async()=>{claims++;owner=mode==='race'?'another':id;return 1}},'@/lib/order-access-shared':shared,'@/lib/revalidate':{revalidatePagePaths:()=>{}}});
  const response=await endpoint.POST(new Request('https://shop.test/api/orders/access',{method:'POST',headers:{origin:mode==='cross-site'?'https://other.test':'https://shop.test','Content-Type':'application/json'},body:JSON.stringify({token:mode==='invalid'?'bad':key})}));const body=await response.json();
  if(mode==='cross-site'){assert.equal(response.status,403);assert.equal(lookups,0)}else if(mode==='invalid'){assert.equal(response.status,404);assert.equal(lookups,0)}else if(mode==='binned'){assert.equal(response.status,410);assert.equal(remembered,0)}else if(mode==='staff'){assert.equal(body.preview,true);assert.equal(remembered,0);assert.equal(claims,0)}else if(mode==='other-owner'){assert.equal(body.saved,false);assert.equal(body.owned,true);assert.equal(remembered,0);assert.equal(claims,0)}else if(mode==='guest'){assert.equal(body.saved,false);assert.equal(remembered,1);assert.equal(claims,0)}else if(mode==='race'){assert.equal(body.saved,false)}else{assert.equal(body.saved,true);assert.equal(claims,1)}
 }
});
test('order emails carry the private customer link alongside cancellation updates',()=>{
 const mail=load('src/lib/mailer.ts',{nodemailer:{},'./order-tracking':load('src/lib/order-tracking.ts')},{process:{env:{}}});
 const result=mail.buildOrderEmail({orderNo:'MG-1',date:'27 October',status:'cancelled',statusLabel:'Cancelled',customerName:'Customer',origin:'https://shop.test',orderUrl:'https://shop.test/orders/'+key,lines:[],subtotal:100,discount:0,shipping:0,total:100,addressHtml:'Dubai'});
 assert.match(result.bodyHtml,new RegExp('/orders/'+key));assert.match(result.bodyHtml,/No sign-in needed/);assert.match(result.subject,/Cancelled/);
});
