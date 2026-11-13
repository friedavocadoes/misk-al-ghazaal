const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={},globals={}){
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,Date,require:key=>{if(key in mocks)return mocks[key];throw Error(key)},...globals});return exports;
}
function generator(enabled=true,rules=[]){
 return load('src/app/sitemap.ts',{
  '@/lib/blogs':{getBlogs:async()=>[{slug:'ritual',blog_categories:{slug:'journal'},updated_at:'2026-11-01T00:00:00Z',image:'/story.jpg'}],blogUrl:p=>'/posts/'+p.blog_categories.slug+'/'+p.slug},
  '@/lib/store':{getProducts:async()=>[{slug:'oud',images:['/oud.jpg']},{slug:'edition',lineupSlug:'originales',images:[]}],getCollections:async()=>[{slug:'all'},{slug:'originales'},{slug:'holy-odh'}]},
  '@/lib/site-url':{getSitemapOrigin:()=> 'https://shop.test'},
  '@/lib/supabase/public':{createPublicClient:()=>({from:()=>({select:async()=>({data:rules})})})},
  '@/lib/info-pages':load('src/lib/info-pages.ts'),
  '@/features/originales/config':{ORIGINALES_ENABLED:enabled,isOriginales:p=>enabled&&p.lineupSlug==='originales',originalesPath:p=>'/originales/'+p.slug},
 }).default;
}
test('sitemap contains public destinations with reciprocal language alternates and actual article dates',async()=>{
 const rows=await generator()(),urls=rows.map(row=>row.url);
 assert.equal(new Set(urls).size,urls.length);
 for(const path of ['/collection/all','/find-your-scent','/gifts','/private-label','/locate-us','/pages/about','/pages/privacy','/originales/edition','/posts/journal/ritual']){
  assert.ok(urls.includes('https://shop.test'+path),path);
  assert.ok(urls.includes('https://shop.test/ar'+path),path);
 }
 assert.ok(!urls.some(url=>/wishlist|sitemap|\/product\/edition|\/collection\/originales|holy-odh|\/blog\//.test(url)));
 const product=rows.find(row=>row.url==='https://shop.test/product/oud');
 assert.deepEqual(JSON.parse(JSON.stringify(product.alternates.languages)),{en:'https://shop.test/product/oud',ar:'https://shop.test/ar/product/oud'});
 assert.equal(product.images[0],'https://shop.test/oud.jpg');
 assert.equal(product.lastModified,undefined);
 assert.equal(rows.find(row=>row.url.endsWith('/posts/journal/ritual')).lastModified.toISOString(),'2026-11-01T00:00:00.000Z');
});
test('noindex and canonical overrides remove noncanonical entries from alternates',async()=>{
 const rows=await generator(true,[{page_type:'info',slug:'contact',robots:'noindex,follow'},{page_type:'product',slug:'oud',canonical:'/product/oud'}])();
 assert.ok(!rows.some(row=>row.url.includes('/pages/contact')));
 assert.ok(!rows.some(row=>row.url==='https://shop.test/ar/product/oud'));
 assert.deepEqual(JSON.parse(JSON.stringify(rows.find(row=>row.url.endsWith('/product/oud')).alternates.languages)),{en:'https://shop.test/product/oud'});
});
test('retiring Originales restores standard product and collection URLs',async()=>{
 const urls=(await generator(false)()).map(row=>row.url);
 assert.ok(urls.includes('https://shop.test/product/edition'));
 assert.ok(urls.includes('https://shop.test/collection/originales'));
 assert.ok(!urls.includes('https://shop.test/originales'));
});
test('sitemap origin uses production when local, preview or missing',()=>{
 for(const value of ['', 'http://localhost:3000','https://preview.vercel.app']){
  const site=load('src/lib/site-url.ts',{}, {process:{env:{NEXT_PUBLIC_SITE_URL:value}}});
  assert.equal(site.getSitemapOrigin(),'https://www.miskalghazaalperfumes.com');
 }
});
