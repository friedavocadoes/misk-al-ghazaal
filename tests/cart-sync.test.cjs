const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync('src/lib/cart.tsx','utf8');
const compiled=ts.transpileModule(source+'\nexport { mergeLines };',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const exportsForTest={};
vm.runInNewContext(compiled,{exports:exportsForTest,require:name=>name==='react'?{createContext:()=>({})}: {}});
const merge=exportsForTest.mergeLines;
const line=(qty,variantId='v1')=>({productSlug:'perfume',variantId,qty});
const plain=x=>JSON.parse(JSON.stringify(x));
test('refreshing mirrored account/local carts repeatedly does not multiply quantities',()=>{
 let local=[line(2)]; const server=[line(2)];
 for(let i=0;i<10;i++) local=merge(local,server);
 assert.deepEqual(plain(local),[line(2)]);
});
test('guest adoption preserves distinct products and keeps overlapping snapshots at the larger quantity',()=>{
 const guest=[line(2),{productSlug:'guest-only',qty:1}];
 const server=[line(3),{productSlug:'account-only',qty:2}];
 const merged=merge(guest,server);
 assert.equal(merged.length,3);assert.equal(merged[0].qty,3);
 assert.deepEqual(plain(merge(merged,server)),plain(merged));
 assert.equal(guest[0].qty,2);assert.equal(server[0].qty,3);
});
test('different variants remain distinct and reconciled quantities stay capped',()=>{
 const result=merge([line(2,'small')],[line(4,'large'),line(30,'small')]);
 assert.deepEqual(plain(result),[line(20,'small'),line(4,'large')]);
});
