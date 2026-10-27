const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>n in mocks?mocks[n]:require(n),URL,URLSearchParams,console,...globals});return exports;}
const model=load('src/lib/admin-customer.ts');
test('delivery maps prefer validated pins, preserve zero coordinates and fall back to escaped full address',()=>{
 let d=model.deliveryDetails({address:'Shop 3 & 4',city:'Dubai',emirate:'Dubai',country_code:'AE',delivery_lat:0,delivery_lng:0});
 assert.equal(d.coordinates,'0.000000, 0.000000');assert.equal(d.lines.filter(v=>v==='Dubai').length,1);assert.equal(new URL(d.mapHref).searchParams.get('query'),'0.000000, 0.000000');
 d=model.deliveryDetails({address:'Building & Road #2',city:'Dubai',delivery_lat:NaN,delivery_lng:200});assert.equal(d.coordinates,null);assert.equal(new URL(d.mapHref).searchParams.get('query'),'Building & Road #2, Dubai');assert.equal(model.deliveryDetails({}).mapHref,null);
});
test('dangerous account actions protect staff and the active administrator',()=>{
 assert.equal(model.canManageCustomer('a','b','customer'),true);assert.equal(model.canManageCustomer('a','a','customer'),false);
 for(const role of ['super_admin','orders','content_editor','unknown'])assert.equal(model.canManageCustomer('a','b',role),false);
});
const actor='10000000-0000-4000-8000-000000000001',target='10000000-0000-4000-8000-000000000002';
function userAction({role='super_admin',targetRole='customer',confirm=true}={}){
 const calls=[];const query={select:()=>query,eq:()=>query,single:async()=>({data:{id:target,email:'customer@example.test',role:targetRole},error:null}),update:patch=>{calls.push(['role',patch]);return query;},then:resolve=>resolve({error:null})};
 const db={from:()=>query,auth:{admin:{updateUserById:async(id,patch)=>{calls.push(['auth',id,patch]);return{error:null};},deleteUser:async()=>{calls.push(['delete']);return{error:null};}}}};
 const actions=load('src/app/admin/users/actions.ts',{'next/headers':{headers:async()=>new Headers({'origin':'https://shop.test'})},'next/navigation':{redirect:href=>{throw Error('redirect:'+href);}},'next/cache':{revalidatePath:()=>{}},'@/lib/admin-auth':{getAdminSession:async()=>({userId:actor,role})},'@/lib/supabase/service':{createAdminClient:()=>db},'@/lib/audit':{logAdmin:async()=>{}},'@/lib/analytics/shared':{uuid:v=>typeof v==='string'&&v.length===36},'@/lib/admin-customer':model},{Headers,process:{env:{}}});
 const fd=new FormData();fd.set('id',target);fd.set('mode','ban');if(confirm)fd.set('confirm','on');return{actions,calls,fd};
}
test('account actions enforce server authorization and confirmation before Auth writes',async()=>{
 for(const options of [{role:'orders'},{role:'content_editor'},{confirm:false},{targetRole:'super_admin'}]){const {actions,fd,calls}=userAction(options);await assert.rejects(actions.manageUser(fd));assert.equal(calls.length,0);}
 const {actions,fd,calls}=userAction();await actions.manageUser(fd);assert.equal(calls[0][0],'auth');assert.equal(calls[0][2].ban_duration,'876000h');fd.set('mode','unban');await actions.manageUser(fd);assert.equal(calls[1][2].ban_duration,'none');
});
test('customer workspace SQL counts account history, excludes binned orders, and sums only paid active orders',async t=>{
 if(!process.env.ANALYTICS_PGLITE_MODULE)return t.skip('Set ANALYTICS_PGLITE_MODULE for disposable PostgreSQL coverage');
 const {PGlite}=require(process.env.ANALYTICS_PGLITE_MODULE),db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,banned_until timestamptz,last_sign_in_at timestamptz);
 create table profiles(id uuid primary key,email text,full_name text,phone text,role text,created_at timestamptz default now());
 create table orders(user_id uuid,created_at timestamptz,total numeric,status text,payment_status text,deleted_at timestamptz);
 insert into profiles(id,email,role) values ('${actor}','staff@test','super_admin'),('${target}','customer@test','customer'),('10000000-0000-4000-8000-000000000003','orders@test','orders');
 insert into auth.users(id) select id from profiles;
 insert into orders values ('${target}','2026-01-01',100,'delivered','paid',null),('${target}','2026-02-01',200,'delivered','refunded',null),('${target}','2026-03-01',300,'new','pending',null),('${target}','2026-04-01',400,'returned','paid',null),('${target}','2026-05-01',500,'delivered','paid',now());`);
 await db.exec(fs.readFileSync('supabase/migration_admin_customer_workspace.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migration_admin_customer_workspace.sql','utf8'));
 let r=(await db.query(`select admin_customer_summary($1,$2,'2026-02-01') as result`,[actor,target])).rows[0].result;
 assert.equal(r.orders,4);assert.equal(r.previous_orders,1);assert.equal(r.paid_total,100);
 r=(await db.query(`select admin_customer_directory($1,'customer','customer',1) as result`,[actor])).rows[0].result;assert.equal(r.total,1);assert.equal(r.rows[0].orders,4);assert.equal(r.rows[0].paid_total,100);
 await assert.rejects(db.query(`select admin_customer_directory($1,'','',1)`,[target]),/Not authorized/);
 await assert.rejects(db.query(`select admin_customer_summary('10000000-0000-4000-8000-000000000003',$1)`,[actor]),/Not authorized/);
 await db.exec(`set role authenticated`);await assert.rejects(db.query(`select admin_customer_summary($1,$2)`,[actor,target]),/permission denied/);
 }finally{await db.close();}
});

test('password reset targets the verified Auth email and rejects repeats, Google-only identities and audit failures',async()=>{
 for(const options of [{},{count:1},{provider:'google'},{auditError:true}]){
  const sent=[];const q={select(){return q},eq(){return q},gte(){return q},single:async()=>({data:{id:target,email:'profile@example.test',role:'customer'}}),then:resolve=>resolve({count:options.count||0,error:options.auditError?{message:'offline'}:null})};
  const db={from:()=>q,auth:{admin:{getUserById:async()=>({error:null,data:{user:{email:'verified@example.test',identities:[{provider:options.provider||'email'}]}}})},resetPasswordForEmail:async(email,config)=>{sent.push({email,config});return{error:null}}}};
  const actions=load('src/app/admin/users/actions.ts',{'next/headers':{headers:async()=>new Headers({'origin':'https://shop.test'})},'next/navigation':{redirect:()=>{}},'next/cache':{revalidatePath:()=>{}},'@/lib/admin-auth':{getAdminSession:async()=>({userId:actor,role:'super_admin'})},'@/lib/supabase/service':{createAdminClient:()=>db},'@/lib/audit':{logAdmin:async()=>{}},'@/lib/analytics/shared':{uuid:()=>true},'@/lib/admin-customer':model},{Headers,process:{env:{}}});
  const fd=new FormData();fd.set('id',target);fd.set('mode','reset');fd.set('confirm','on');fd.set('email','attacker@example.test');
  if(Object.keys(options).length){await assert.rejects(actions.manageUser(fd));assert.equal(sent.length,0)}else{await actions.manageUser(fd);assert.equal(sent[0].email,'verified@example.test');assert.equal(sent[0].config.redirectTo,'https://shop.test/account/reset')}
 }
});
test('account deletion requires matching email, and role mutation cannot modify self or accept unknown roles',async()=>{
 let x=userAction();x.fd.set('mode','delete');x.fd.set('email','wrong@example.test');await assert.rejects(x.actions.manageUser(x.fd),/email/);assert.equal(x.calls.length,0);
 x=userAction();x.fd.set('mode','role');x.fd.set('role','service_role');await assert.rejects(x.actions.manageUser(x.fd),/Invalid role/);assert.equal(x.calls.length,0);
 x=userAction();x.fd.set('mode','role');x.fd.set('id',actor);x.fd.set('role','customer');await assert.rejects(x.actions.manageUser(x.fd),/own access/);assert.equal(x.calls.length,0);
});
