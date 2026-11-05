const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,mocks={}){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,require:key=>key in mocks?mocks[key]:require(key),URL,Request,Response,Date,
 });
 return exports;
}
class Reply extends Response {
 constructor(body,options){super(body,options);this.written=[];this.cookies={set:(...args)=>this.written.push(args)};}
 static json(value,options){return new Reply(JSON.stringify(value),options);}
 static redirect(url,status){return new Reply(null,{status,headers:{location:String(url)}});}
}
const shared=load('src/lib/google-redirect.ts');
const state='a'.repeat(32),nonce='b'.repeat(64);
const user={id:'customer',email:'test@example.test'};
function callback({csrf='csrf',cookieCsrf='csrf',attempt={nonce,next:'/ar/checkout',locale:'ar',ref:'FRIEND',expires:Date.now()+60000},error=null}={}){
 let exchanged=0,setup=0,options,context;
 const jar={get:key=>key===shared.GOOGLE_ATTEMPT_PREFIX+state && attempt?{value:JSON.stringify(attempt)}:undefined};
 const route=load('src/app/auth/google/route.ts',{
  'next/server':{NextResponse:Reply},
  'next/headers':{cookies:async()=>jar},
  '@/lib/google-redirect':shared,
  '@/lib/supabase/server':{createClient:async()=>({auth:{signInWithIdToken:async value=>{exchanged++;options=value;return {data:{user},error};}}})},
  '@/lib/auth-bootstrap':{bootstrapShopper:async(...args)=>{setup++;context=args;}},
 });
 const request=new Request('https://shop.test/auth/google',{method:'POST',body:new URLSearchParams({credential:'google-token',g_csrf_token:csrf,state})});
 request.cookies={get:key=>key==='g_csrf_token'?{value:cookieCsrf}:undefined};
 return {run:()=>route.POST(request),snapshot:()=>({exchanged,setup,options,context})};
}
test('same-tab callback verifies nonce, bootstraps account, clears attempt and returns with GET',async()=>{
 const h=callback(),response=await h.run();
 assert.equal(response.status,303);
 assert.equal(response.headers.get('location'),'https://shop.test/ar/checkout');
 assert.equal(response.written[0][0],shared.GOOGLE_ATTEMPT_PREFIX+state);
 assert.equal(response.written[0][2].maxAge,0);
 assert.deepEqual(JSON.parse(JSON.stringify(h.snapshot().options)),{provider:'google',token:'google-token',nonce});
 assert.equal(h.snapshot().context[2],'FRIEND');
});
test('mismatched or absent Google CSRF prevents session creation',async()=>{
 for(const opts of [{csrf:''},{cookieCsrf:'different'}]){
  const h=callback(opts);assert.equal((await h.run()).status,403);assert.equal(h.snapshot().exchanged,0);
 }
});
test('missing and expired attempt cannot authenticate',async()=>{
 for(const attempt of [null,{nonce,expires:1}]){
  const h=callback({attempt});assert.equal((await h.run()).status,303);assert.equal(h.snapshot().exchanged,0);
 }
});
test('invalid credential returns localized actionable login error without bootstrapping',async()=>{
 const h=callback({error:{message:'invalid token'}}),response=await h.run();
 assert.match(response.headers.get('location'),/^https:\/\/shop.test\/ar\/account\/login\?error=google/);
 assert.equal(h.snapshot().setup,0);
});
test('redirect targets reject external URLs and backslash bypasses',()=>{
 for(const path of ['https://evil.test','//evil.test','/\\evil.test','/\n/evil.test']){
  assert.equal(shared.safeAuthNext(path),'/account');
 }
 assert.equal(shared.safeAuthNext('/checkout?coupon=TEST'),'/checkout?coupon=TEST');
});
test('start requires same-origin POST and issues independent nonce cookies for concurrent attempts',async()=>{
 const route=load('src/app/auth/google/start/route.ts',{'next/server':{NextResponse:Reply},'@/lib/google-redirect':shared});
 const make=origin=>new Request('https://shop.test/auth/google/start',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({next:'//evil.test',locale:'ar'})});
 assert.equal((await route.POST(make('https://evil.test'))).status,403);
 const first=await route.POST(make('https://shop.test')),second=await route.POST(make('https://shop.test'));
 assert.notEqual(first.written[0][0],second.written[0][0]);
 const [name,value,opts]=first.written[0],attempt=JSON.parse(value),data=await first.json();
 assert.equal(attempt.next,'/ar/account');
 assert.equal(name,shared.GOOGLE_ATTEMPT_PREFIX+data.state);
 assert.equal(data.nonce,require('node:crypto').createHash('sha256').update(attempt.nonce).digest('hex'));
 assert.ok(opts.httpOnly&&opts.secure&&opts.sameSite==='none');
});
