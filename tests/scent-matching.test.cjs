const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const mod = new Module("scent-matching");
const optionMod=new Module("product-options");
optionMod._compile(ts.transpileModule(fs.readFileSync("src/lib/product-options.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,"product-options.js");
mod.require=(name)=>name==="./product-options"?optionMod.exports:require(name);
mod._compile(ts.transpileModule(fs.readFileSync("src/lib/scent-matching.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, "scent-matching.js");
const { rankScents, audienceMatches, noteTint } = mod.exports;
const product = (slug, notes, categorySlugs = ["for-him"], extra = {}) => ({ slug, id:slug, notes:notes.map(slug => ({slug})), categorySlugs, tags:[], variants:[{stock:1}], ...extra });
test("ranks exact, partial, other audience, and audience-only alternatives honestly", () => {
  const pool = [product("fallback",[]),product("other",["amber","rose","oud"],["for-her"]),product("partial",["amber"]),product("exact",["amber","rose","oud"]),product("two",["amber","rose"])];
  const result = rankScents(pool,"men",["amber","rose","oud"]);
  assert.deepEqual(result.map(r=>r.product.slug),["exact","two","partial","other","fallback"]);
  assert.deepEqual(result.map(r=>r.hits.length),[3,2,1,3,0]);
  assert.equal(result[3].audienceMatch,false);
});
test("unmatched notes still offer audience alternatives; inactive products are excluded", () => {
  const result=rankScents([product("wrong",[],["for-her"]),product("paused",["unknown"],["for-him"],{isActive:false}),product("men",[])],"men",["unknown"]);
  assert.equal(result[0].product.slug,"men"); assert.ok(result.every(r=>r.hits.length===0)); assert.equal(result.length,2);
});
test("unisex requires explicit tags or both collections, not missing metadata", () => {
  assert.equal(audienceMatches(product("unknown",[],[]),"unisex"),false);
  assert.equal(audienceMatches(product("both",[],["for-him","for-her"]),"unisex"),true);
  assert.equal(audienceMatches(product("tag",[],[],{tags:["Unisex"]}),"women"),true);
});
test("duplicate selected notes do not inflate hits; colors stay stable", () => {
  assert.equal(rankScents([product("one",["amber"])],"men",["Amber","amber"])[0].hits.length,1);
  assert.equal(noteTint("New note"),noteTint("New note"));
  assert.deepEqual(rankScents([],"men",["amber"]),[]);
});
