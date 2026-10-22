const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
function load(file,mocks={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>mocks[name],...globals});return exports;}
const savings=load('src/lib/coupon-savings.ts');
test('percent savings use cents, quantity subtotal, caps and safe limits',()=>{
 assert.equal(savings.couponSavings(189,{kind:'percent',amount:20}),37.8);
 assert.equal(savings.couponSavings(378,{kind:'percent',amount:20}),75.6);
 assert.equal(savings.couponSavings(1000,{kind:'percent',amount:20,maxDiscount:50}),50);
 assert.equal(savings.couponSavings(10,{kind:'percent',amount:200}),10);
 assert.equal(savings.couponSavings(189,{kind:'fixed',amount:60}),60);
 assert.equal(savings.couponSavings(0.1,{kind:'percent',amount:10}),.01);
});
test('authoritative quote applies 20% to merchandise, not shipping, without whole-dirham inflation',async()=>{
 const db={from:table=>{const q={select:()=>q,in:()=>q,is:()=>q,eq:()=>q,single:async()=>({data:{id:'coupon',code:'TWENTY',kind:'percent',amount:20,min_subtotal:0,active:true,first_order_only:false,once_per_account:false,usage_limit:null,max_discount:null,used_count:0}}),then:resolve=>Promise.resolve({data:table==='products'?[{id:'p',slug:'oud',title:'Oud',price:189}]:[{id:'v',product_id:'p',title:'50ml',price:189,stock:100}]}).then(resolve)};return q;}};
 const {quoteBag}=load('src/lib/pricing.ts',{'./coupon-savings':savings,'./supabase/service':{createAdminClient:()=>db},'./pricing-client':{FREE_SHIP_THRESHOLD:200,FLAT_SHIPPING:26}});
 const first=await quoteBag({lines:[{slug:'oud',variantId:'v',qty:1}],couponCode:'TWENTY'});
 assert.equal(first.quote.subtotal,189);assert.equal(first.quote.discount,37.8);assert.equal(first.quote.shipping,26);assert.equal(first.quote.total,177.2);
 const second=await quoteBag({lines:[{slug:'oud',variantId:'v',qty:2}],couponCode:'TWENTY'});assert.equal(second.quote.discount,75.6);assert.equal(second.quote.total,302.4);
});
test('mobile fly-to-bag ignores hidden desktop target and travels to visible bag',()=>{
 let frames,options;class FakeImage{style={};setAttribute(){}remove(){}animate(f,o){frames=f;options=o;return {};}}
 const source={getBoundingClientRect:()=>({left:80,top:500,width:100,height:50})};
 const hidden={getBoundingClientRect:()=>({left:0,top:0,width:0,height:0,right:0,bottom:0})};
 const visible={getBoundingClientRect:()=>({left:340,top:20,width:40,height:40,right:380,bottom:60})};
 const globals={HTMLImageElement:FakeImage,innerWidth:390,innerHeight:844,getComputedStyle:()=>({visibility:'visible'}),CustomEvent:class{},window:{innerWidth:390,matchMedia:()=>({matches:false}),dispatchEvent:()=>{}},document:{createElement:()=>new FakeImage(),body:{appendChild:()=>{}},querySelectorAll:()=>[hidden,visible]}};
 load('src/lib/fly-to-bag.ts',{},globals).flyToBag(source,'/image.webp');assert.match(frames.at(-1).transform,/230px/);assert.equal(options.duration,1250);assert.ok(frames.length>10);
});
const policy=load('src/lib/analytics/survey-policy.ts');
test('survey eligibility permits a fresh return, but respects session, dismissal and answer cooldowns',()=>{
 const now=1e10;assert.equal(policy.surveyEligible(now,{},false,false),true);
 assert.equal(policy.surveyEligible(now,{},true,false),false);assert.equal(policy.surveyEligible(now,{},false,true),false);
 assert.equal(policy.surveyEligible(now,{dismissedAt:now-1000},false,false),false);
 assert.equal(policy.surveyEligible(now,{answeredAt:now-3600000},false,false),false);
 assert.equal(policy.surveyEligible(now,{dismissedAt:now-3*3600000},false,false),true);
});
test('survey routing recognizes localized checkout and product journeys',()=>{
 assert.equal(policy.isShoppingPath('/ar/checkout'),true);assert.equal(policy.productSlug('/ar/product/oud'),'oud');assert.equal(policy.productSlug('/collection/all'),null);
});
