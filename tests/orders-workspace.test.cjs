const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(file,mocks={},env={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),process:{env},URL,URLSearchParams,Request,Response,ReadableStream,TextEncoder,encodeURIComponent,console});return exports;}
const tracking=load('src/lib/order-tracking.ts');const status=load('src/lib/order-status.tsx');const model=load('src/lib/admin-orders-model.ts');
test('shared SMTP connection applies to every mailbox while sender credentials remain separate',async()=>{
 const configs=[];const env={SMTP_HOST:'shared.example.test',SMTP_PORT:'587',SMTP_SECURE:'0',HELLO_SMTP_HOST:'deprecated.example.test',HELLO_SMTP_PORT:'465',HELLO_SMTP_SECURE:'1'};
 for(const p of ['HELLO','NOREPLY','PROMO','ORDERS']){env[p+'_SMTP_USER']=p.toLowerCase()+'@example.test';env[p+'_SMTP_PASS']='test-placeholder';}
 const mail=load('src/lib/mailer.ts',{'./order-tracking':tracking,'./notification-settings':{systemEmailAllowed:async()=>true},'./leads':{getEmailCommunicationLink:async()=>({url:'https://shop.test/preferences/test',unsubscribeUrl:'https://shop.test/api/preferences/test/unsubscribe',marketing:true})},nodemailer:{createTransport:c=>{configs.push(c);return{sendMail:async()=>{}}}}},env);
 for(const m of ['hello','noreply','promo','orders'])assert.equal((await mail.sendMailboxMail(m,{to:'customer@example.test',subject:'Test',title:'Test',preheader:'Test',bodyHtml:'<p>Test</p>'})).sent,true);
 assert.equal(configs.length,4);for(const c of configs){assert.equal(c.host,env.SMTP_HOST);assert.equal(c.port,587);assert.equal(c.secure,false);}assert.notEqual(configs[0].auth.user,configs[1].auth.user);
 assert.equal(mail.smtpConnectionSettings({SMTP_HOST:'mail',SMTP_PORT:'invalid'}).secure,true);
 assert.equal(mail.smtpConnectionSettings({SMTP_HOST:'mail',SMTP_PORT:'465',SMTP_SECURE:'true'}).secure,true);
 assert.equal(mail.smtpConnectionSettings({HELLO_SMTP_HOST:'legacy',HELLO_SMTP_PORT:'587'}).host,'legacy');
});
test('tracking uses default carrier, safe optional templates, and no premature tracking for pending parcels',()=>{
 assert.equal(tracking.trackingLink(null,'123'),tracking.DEFAULT_TRACKING_URL);
 const url=new URL(tracking.trackingLink('https://courier.example/track?ref={tracking}','A&B /1'));assert.equal(url.searchParams.get('ref'),'A&B /1');
 for(const bad of ['javascript:alert(1)','data:text/html,x','https://user:password@courier.example/'])assert.throws(()=>tracking.trackingLink(bad,'123'));
 assert.equal(tracking.canTrackOrder('new','123'),false);assert.equal(tracking.canTrackOrder('dispatched',null),false);assert.equal(tracking.canTrackOrder('dispatched','123'),true);assert.equal(status.journeyIndex('packed'),status.journeyIndex('confirmed'));
 assert.equal(status.statusLabel('confirmed'),'Confirmed');assert.equal(status.statusLabel('dispatched'),'Dispatched');
});
test('order dates use Dubai calendar days and filters validate dates, states and selected IDs',()=>{
 assert.match(model.readableOrderDate('2026-10-26T21:00:00Z',new Date('2026-10-27T02:00:00Z')),/^Today/);
 assert.match(model.readableOrderDate('2026-10-26T18:00:00Z',new Date('2026-10-27T02:00:00Z')),/^Yesterday/);
 const {ordersQuery}=load('src/lib/admin-orders-query.ts',{'./order-status':status,'./admin-orders-model':model,'./analytics/shared':load('src/lib/analytics/shared.ts')});
 const q=ordersQuery(new URLSearchParams('status=dispatched&method=tabby&payment=paid&start=2026-10-27&end=2026-10-27'));
 assert.equal(q.start_date,'2026-10-26T20:00:00.000Z');assert.equal(q.end_date,'2026-10-27T20:00:00.000Z');
 for(const bad of ['status=invalid','payment=invalid','method=unknown','start=2026-02-30','ids=broken','start=2026-10-28&end=2026-10-27'])assert.throws(()=>ordersQuery(new URLSearchParams(bad)));
});

test('CSV export walks every matching page and escapes spreadsheet formulas',async()=>{
 let calls=0,audits=0;const shared=load('src/lib/analytics/shared.ts');
 const row=n=>({id:String(n),order_no:'MG-'+n,created_at:'2026-10-27T02:00:00Z',customer_name:n===1?'=SUM(1)':'Customer',email:'test@example.test',phone:'test',total:100,status:'new',payment_method:'cod',payment_status:'pending',tracking_no:null,order_items:[{title:'Oud',qty:2}]});
 const route=load('src/app/api/admin/orders/export/route.ts',{
  '@/lib/admin-auth':{getAdminSession:async()=>({role:'orders',userId:'staff'})},
  '@/lib/supabase/service':{createAdminClient:()=>({rpc:async(name,args)=>{assert.equal(name,'admin_orders_report');calls++;assert.equal(args.page_offset,calls===1?0:2);return{error:null,data:{total:3,rows:calls===1?[row(1),row(2)]:[row(3)]}};}})},
  '@/lib/admin-orders-query':{ordersQuery:()=>({})},'@/lib/analytics/shared':shared,'@/lib/admin-orders-model':model,'@/lib/order-status':status,
  '@/lib/audit':{logAdmin:async()=>{audits++;}},
 });
 const response=await route.GET(new Request('https://store.test/api/admin/orders/export'));
 assert.equal(response.status,200);const csv=await response.text();assert.equal(calls,2);assert.equal(audits,1);assert.match(csv,/MG-3/);assert.match(csv,/'=SUM/);assert.match(response.headers.get('cache-control'),/no-store/);
});

test('manual, bulk, and export endpoints deny non-order roles before database access',async()=>{
 const mocks={
  'next/server':{NextResponse:class extends Response{static json(b,o){return Response.json(b,o)}},after:()=>{}},
  '@/lib/admin-auth':{getAdminSession:async()=>({role:'content_editor'})},
  '@/lib/supabase/service':{createAdminClient:()=>{throw Error('Unexpected database access')}},
  '@/lib/admin-orders-query':{},'@/lib/pricing':{},'@/lib/admin-orders-model':{},'@/lib/analytics/shared':{},'@/lib/order-notifications':{},'@/lib/whatsapp':{},'@/lib/telegram':{},'@/lib/audit':{},'@/lib/revalidate':{},'@/lib/order-status':{},'next/cache':{},
 };
 const main=load('src/app/api/admin/orders/route.ts',mocks);assert.equal((await main.GET(new Request('https://store.test/api/admin/orders'))).status,403);assert.equal((await main.POST(new Request('https://store.test/api/admin/orders',{method:'POST'}))).status,403);
 const bulk=load('src/app/api/admin/orders/bulk/route.ts',mocks);assert.equal((await bulk.POST(new Request('https://store.test/api/admin/orders/bulk',{method:'POST'}))).status,403);
 const exporter=load('src/app/api/admin/orders/export/route.ts',mocks);assert.equal((await exporter.GET(new Request('https://store.test/api/admin/orders/export'))).status,403);
});

test('a lost-response manual order retry returns the existing order before stock is repriced',async()=>{
 const uuid='11111111-1111-4111-8111-111111111111';let priced=false;
 const route=load('src/app/api/admin/orders/route.ts',{
  'next/server':{NextResponse:class extends Response{static json(b,o){return Response.json(b,o)}},after:()=>{}},
  '@/lib/admin-auth':{getAdminSession:async()=>({role:'orders',userId:uuid})},
  '@/lib/supabase/service':{createAdminClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:uuid,order_no:'MG-0001',created_by:uuid},error:null})})})})})},
  '@/lib/admin-orders-query':{},'@/lib/pricing':{quoteBag:async()=>{priced=true;throw Error('Out of stock')}},'@/lib/admin-orders-model':model,'@/lib/analytics/shared':load('src/lib/analytics/shared.ts'),'@/lib/order-notifications':{},'@/lib/whatsapp':{},'@/lib/telegram':{},'@/lib/audit':{},'@/lib/revalidate':{},
 });
 const response=await route.POST(new Request('https://store.test/api/admin/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:uuid,customer_name:'Test',phone:'123',address:'Street',city:'Dubai',state:'Dubai',country:'AE',payment_method:'cod',payment_status:'pending',items:[{slug:'oud',qty:1}]})}));
 assert.equal(response.status,200);assert.equal((await response.json()).existing,true);assert.equal(priced,false);
});

test('actual SQL: atomic manual stock, replay protection, row validation, bulk rollback, reports, soft bin and roles',{skip:!process.env.ANALYTICS_PGLITE_MODULE},async()=>{
 const {PGlite}=require(process.env.ANALYTICS_PGLITE_MODULE);const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table profiles(id uuid primary key,role text);
 create table products(id uuid primary key,slug text unique,title text,price numeric,deleted_at timestamptz,is_active bool default true,out_of_stock bool default false);
 create table variants(id uuid primary key,product_id uuid references products(id),title text,price numeric,stock int,is_active bool default true,name_override text);
 create table orders(id uuid primary key default gen_random_uuid(),order_no text unique,customer_name text,phone text,email text,address text,city text,emirate text,country_code text,state_name text,postcode text,notes text,subtotal numeric,discount numeric default 0,shipping numeric,total numeric,payment_method text default 'cod',status text default 'new',tracking_no text,tracking_url text,internal_note text,expected_delivery_date date,invoice_source text default 'auto',deleted_at timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
 create table order_items(id uuid primary key default gen_random_uuid(),order_id uuid references orders(id),product_slug text,variant_id uuid,title text,qty int,unit_price numeric,created_at timestamptz default now());
 create table order_status_history(id uuid primary key default gen_random_uuid(),order_id uuid references orders(id),from_status text,to_status text,changed_by uuid,note text,created_at timestamptz default now());`);
 const sql=fs.readFileSync('supabase/migration_orders_workspace.sql','utf8');await db.exec(sql);await db.exec(sql);
 await db.exec('create trigger orders_assign_no before insert or update on orders for each row execute function assign_order_no()');
 const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
 for(const [n,role] of [[1,'super_admin'],[2,'orders'],[3,'customer'],[4,'content_editor']])await db.query('insert into profiles values($1,$2)',[id(n),role]);
 await db.query("insert into products(id,slug,title,price) values($1,'oud','Oud',100),($2,'rose','Rose',80)",[id(10),id(11)]);
 await db.query("insert into variants(id,product_id,title,price,stock) values($1,$2,'50ml',125,3),($3,$4,'100ml',90,null)",[id(20),id(10),id(21),id(11)]);
 const customer={name:'Test Client',phone:'+971500000000',email:'test@example.test',address:'Test street',city:'Dubai',state:'Dubai',country:'AE'};
 const create=async(req,items,actor=id(1))=>(await db.query("select admin_create_order($1,$2,$3,$4,20,'cod','pending') as data",[actor,req,JSON.stringify(customer),JSON.stringify(items)])).rows[0].data;
 const a=await create(id(30),[{slug:'oud',variant_id:id(20),qty:2,unit:1}]);assert.equal(a.existing,false);
 let order=(await db.query('select * from orders where id=$1',[a.id])).rows[0];assert.equal(Number(order.total),270);assert.equal(order.payment_status,'pending');assert.equal(order.tracking_url,tracking.DEFAULT_TRACKING_URL);
 const replay=await create(id(30),[{slug:'oud',variant_id:id(20),qty:2}]);assert.equal(replay.id,a.id);assert.equal(replay.existing,true);assert.equal((await db.query('select stock from variants where id=$1',[id(20)])).rows[0].stock,1);
 const countBefore=(await db.query('select count(*)::int as n from orders')).rows[0].n;
 await assert.rejects(create(id(31),[{slug:'rose',variant_id:id(21),qty:1},{slug:'oud',variant_id:id(20),qty:2}]));
 assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,countBefore);assert.equal((await db.query('select stock from variants where id=$1',[id(20)])).rows[0].stock,1);
 await assert.rejects(create(id(32),[{slug:'oud',variant_id:id(21),qty:1}]));
 await assert.rejects(create(id(33),[{slug:'oud',variant_id:id(20),qty:1}],id(3)));
 const b=await create(id(34),[{slug:'rose',variant_id:id(21),qty:2}],id(2));assert.equal((await db.query('select stock from variants where id=$1',[id(21)])).rows[0].stock,null);
 const patch=async(oid,body)=>(await db.query('select admin_update_order($1,$2,$3) as data',[id(1),oid,JSON.stringify({status:'dispatched',payment_status:'pending',tracking_url:tracking.DEFAULT_TRACKING_URL,...body})])).rows[0].data;
 await assert.rejects(patch(a.id,{tracking_no:''}));assert.equal((await db.query('select status from orders where id=$1',[a.id])).rows[0].status,'new');
 await patch(a.id,{tracking_no:'MAX-123'});
 await assert.rejects(db.query("select admin_bulk_orders($1,$2,'out_for_delivery',null,false)",[id(1),[a.id,b.id]]));assert.equal((await db.query('select status from orders where id=$1',[a.id])).rows[0].status,'dispatched');
 await patch(b.id,{tracking_no:'MAX-456'});await db.query("select admin_bulk_orders($1,$2,'out_for_delivery','paid',false)",[id(1),[a.id,b.id]]);
 assert.equal((await db.query("select count(*)::int as n from orders where payment_status='paid' and status='out_for_delivery'")).rows[0].n,2);
 const report=async(q='',offset=0,limit=50)=>(await db.query("select admin_orders_report($1,'','','',null,null,$2,$3,'newest',null) as data",[q,offset,limit])).rows[0].data;
 const all=await report();assert.equal(all.total,2);assert.equal(all.summary.items,4);assert.equal(all.summary.dispatched,2);assert.equal(all.rows[0].order_items.length,1);
 assert.equal((await report('MAX-123')).total,1);assert.equal((await report('',1,1)).rows.length,1);
 await db.query("update orders set status='packed' where id=$1",[b.id]);await patch(b.id,{status:'packed',tracking_no:'MAX-456'});assert.equal((await db.query('select status from orders where id=$1',[b.id])).rows[0].status,'packed');
 await db.query('select admin_bulk_orders($1,$2,null,null,true)',[id(1),[a.id]]);assert.equal((await report()).total,1);assert.equal((await db.query('select count(*)::int as n from order_items where order_id=$1',[a.id])).rows[0].n,1);
 await assert.rejects(db.query("select admin_bulk_orders($1,$2,'confirmed',null,false)",[id(4),[b.id]]));
 await db.exec('set role anon');await assert.rejects(db.query('select admin_orders_report()'));await assert.rejects(db.query("select admin_bulk_orders(null,'{}',null,null,false)"));await db.exec('reset role');
 assert.equal((await db.query("select has_sequence_privilege('service_role','order_number_seq','USAGE') as allowed")).rows[0].allowed,true);
 }finally{await db.close();}
});
