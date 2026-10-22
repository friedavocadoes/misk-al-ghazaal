const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const modulePath=process.env.ANALYTICS_PGLITE_MODULE;
test('ranking migrations: demand, dedupe, decay, admin policy, stock options and service access',{skip:!modulePath},async()=>{
 const {PGlite}=require(modulePath);const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);
 create table profiles(id uuid primary key,full_name text,phone text,default_address jsonb,promo_opt_in bool,order_updates_opt_in bool,role text);
 create table orders(id uuid primary key,user_id uuid,status text,deleted_at timestamptz,created_at timestamptz default now(),total numeric);
 create table order_items(order_id uuid,product_slug text,qty integer);
 create table products(id uuid primary key default gen_random_uuid(),slug text unique,title text,is_active boolean default true,deleted_at timestamptz,is_best_seller boolean default false);
 create table variants(id uuid primary key default gen_random_uuid(),product_id uuid references products(id),title text,price numeric,stock integer not null default 0);
 create table admin_audit_log(user_email text,user_role text,category text,action text,entity text,entity_id text,entity_label text,summary text,details jsonb);`);
 await db.exec(fs.readFileSync('supabase/migration_analytics.sql','utf8'));
 const ranking=fs.readFileSync('supabase/migration_demand_ranking.sql','utf8'),options=fs.readFileSync('supabase/migration_product_options.sql','utf8');
 await db.exec(`insert into products(slug,title,is_best_seller) values('pinned','Pinned',true),('popular','Popular',false),('bought','Bought',false),('spam','Spam',false),('excluded','Excluded',false);insert into products(slug,title) select 'other-'||n,'Other '||n from generate_series(1,5) n;insert into variants(product_id,title,price,stock) select id,'100g',100,5 from products where slug='pinned';`);
 await db.exec(options);await db.exec(options);
 const optional=fs.readFileSync('supabase/migration_optional_stock.sql','utf8');
 await db.exec(optional);await db.exec(optional);
 const vid=(await db.query('select id from variants limit 1')).rows[0].id;
 await db.query('select decrement_stock($1,1)',[vid]);assert.equal((await db.query('select stock from variants where id=$1',[vid])).rows[0].stock,4);
 await db.query('update variants set stock=null where id=$1',[vid]);await db.query('select decrement_stock($1,20)',[vid]);
 assert.equal((await db.query('select stock from variants where id=$1',[vid])).rows[0].stock,null);
 await db.query('update variants set stock=0 where id=$1',[vid]);await assert.rejects(db.query('select decrement_stock($1,1)',[vid]),/insufficient stock/);
 await assert.rejects(db.query('select decrement_stock($1,0)',[vid]),/invalid stock quantity/);
 await db.exec('set role anon');await assert.rejects(db.query('select decrement_stock($1,1)',[vid]));await db.exec('reset role');
 await db.exec(ranking);await db.exec(ranking);
 assert.equal((await db.query("select capacity_ml from variants where title='100g'")).rows[0].capacity_ml,null);
 assert.equal((await db.query("select bestseller_mode from products where slug='pinned'")).rows[0].bestseller_mode,'pinned');
 await db.exec("update products set bestseller_mode='excluded' where slug='excluded'");
 const run=async(visitor,event,product,extra={})=>{const id=`00000000-0000-4000-8000-${String(visitor).padStart(12,'0')}`;await db.query('select ingest_analytics_event($1::jsonb,$2::jsonb)',[JSON.stringify({id,visitor_id:id,...extra}),JSON.stringify({event_type:event,product_id:product,page_path:'/product/'+product})]);};
 for(let n=1;n<=3;n++){await run(n,'product_view','popular');await run(n,'add_to_cart','popular');await run(n,'checkout_started',null);}
 for(let n=0;n<60;n++)await run(4,'product_view','spam');
 const staff='20000000-0000-4000-8000-000000000001';
 await db.query("insert into auth.users(id,email) values($1,'staff@example.test')",[staff]);
 await db.query("insert into profiles(id,role) values($1,'super_admin')",[staff]);
 for(let n=0;n<20;n++){await run(5,'product_view','spam',{is_bot:true});await run(6,'product_view','spam',{user_id:staff});}
 const binned='30000000-0000-4000-8000-000000000001';
 await db.query("insert into orders(id,status,total,deleted_at) values($1,'new',100,now())",[binned]);
 await db.query("insert into order_items values($1,'spam',1)",[binned]);
 for(const [product,offset] of [['bought',10],['excluded',20]])for(let n=0;n<2;n++){const id=`10000000-0000-4000-8000-${String(offset+n).padStart(12,'0')}`;await db.query("insert into orders(id,status,total) values($1,'new',100)",[id]);await db.query('insert into order_items values($1,$2,1)',[id,product]);}
 await db.query("select refresh_product_demand(true)");
 const rows=(await db.query('select slug,is_best_seller,auto_best_seller,demand_score from products')).rows;
 const by=Object.fromEntries(rows.map(r=>[r.slug,r]));
 assert.equal(by.popular.is_best_seller,true);assert.equal(by.bought.is_best_seller,true);assert.equal(by.spam.is_best_seller,false);assert.equal(Number(by.spam.demand_score),0.5);assert.equal(by.excluded.is_best_seller,false);assert.equal(by.pinned.is_best_seller,true);
 const count=(await db.query('select count(*) as n from admin_audit_log')).rows[0].n;
 await db.query('select refresh_product_demand(true)');assert.equal((await db.query('select count(*) as n from admin_audit_log')).rows[0].n,count);
 const skipped=(await db.query('select refresh_product_demand(false) as result')).rows[0].result;assert.equal(skipped.refreshed,false);
 await db.exec("update analytics_events set created_at=now()-interval '31 days' where product_id='popular';update orders set status='cancelled';");await db.query('select refresh_product_demand(true)');
 assert.equal((await db.query("select is_best_seller from products where slug='popular'")).rows[0].is_best_seller,false);assert.equal((await db.query("select is_best_seller from products where slug='bought'")).rows[0].is_best_seller,false);
 assert.ok((await db.query("select * from admin_audit_log where action='auto_rank' and user_role='system'")).rows.length>=4);
 await db.exec('set role anon');await assert.rejects(db.query('select refresh_product_demand(true)'));await db.exec('reset role');
 }finally{await db.close();}
});
