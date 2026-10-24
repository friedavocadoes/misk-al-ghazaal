import { productAvailable } from "./product-options";
import MiniSearch from "minisearch";
import type { Product } from "./types";

export interface SearchDocument {
  id: string;
  slug: string;
  title: string;
  titleAr?: string;
  image?: string;
  price: number;
  compareAtPrice?: number;
  lineupTitle?: string;
  lineupTitleAr?: string;
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  isActive?: boolean;
  outOfStock?: boolean;
  variantCount: number;
  firstVariant?: string;
  topNotes: { name: string; nameAr?: string }[];
  keywords: string;
}
export function searchDocument(p: Product): SearchDocument {
  return { id:p.id, slug:p.slug, title:p.title, titleAr:p.titleAr, image:p.images[0], price:p.price,
    compareAtPrice:p.compareAtPrice, lineupTitle:p.lineupTitle, lineupTitleAr:p.lineupTitleAr,
    rating:p.rating, reviewCount:p.reviewCount, isNew:p.isNew, isBestSeller:p.isBestSeller,
    isActive:p.isActive, outOfStock:!productAvailable(p), variantCount:p.variants.length,
    firstVariant:p.variants[0]?.title, topNotes:p.notes.filter(n=>n.kind==="top").slice(0,2).map(n=>({name:n.name,nameAr:n.nameAr})),
    keywords:[p.slug,p.lineupTitle,p.lineupTitleAr,...p.categorySlugs,...p.notes.flatMap(n=>[n.name,n.nameAr]),...p.variants.map(v=>v.title)].filter(Boolean).join(" ") };
}
export function normalizeSearchTerm(term:string):string {
  return term.normalize("NFKD").replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").toLowerCase();
}
const compactName=(value:string)=>normalizeSearchTerm(value).replace(/[^\p{L}\p{N}]/gu,"");
export function createSearchIndex(documents: SearchDocument[]) {
  type Indexed=SearchDocument & {compactTitle:string;compactTitleAr:string};
  const engine = new MiniSearch<Indexed>({fields:["title","titleAr","keywords","compactTitle","compactTitleAr"],
    processTerm:normalizeSearchTerm,
    searchOptions:{prefix:true,combineWith:"AND",maxFuzzy:3,boost:{title:5,titleAr:5,keywords:1,compactTitle:4,compactTitleAr:4}}});
  engine.addAll(documents.map(d=>({...d,compactTitle:compactName(d.title),compactTitleAr:compactName(d.titleAr??"")})));
  const byId = new Map(documents.map(d=>[d.id,d]));
  return {search:(query:string,limit=1000)=>{
    const clean=query.trim().slice(0,160);
    if(!clean)return [];
    const found=new Map<string,SearchDocument>();
    const add=(hits:ReturnType<typeof engine.search>)=>{for(const hit of hits){const doc=byId.get(String(hit.id));if(doc && !found.has(doc.id))found.set(doc.id,doc);}};
    // Exact names and prefixes always come before approximate spelling matches.
    add(engine.search(clean,{fuzzy:false,fields:["title","titleAr","keywords"]}));
    const compact=compactName(clean);
    if(found.size<limit && compact.length>=3)add(engine.search(compact,{fuzzy:false,fields:["compactTitle","compactTitleAr"]}));
    if(found.size<limit && clean.length>=3){
      const fuzzy=(term:string)=>term.length<3?false:term.length<=5?1:term.length<=9?2:3;
      add(engine.search(clean,{fuzzy,fields:["title","titleAr","keywords"]}));
      if(found.size<limit && compact.length>=4)add(engine.search(compact,{fuzzy,fields:["compactTitle","compactTitleAr"]}));
    }
    return [...found.values()].slice(0,Math.max(0,limit));
  }};
}
