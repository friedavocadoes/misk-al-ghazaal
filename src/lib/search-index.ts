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
    isActive:p.isActive, outOfStock:p.outOfStock || !p.variants.some(v=>v.stock>0), variantCount:p.variants.length,
    firstVariant:p.variants[0]?.title, topNotes:p.notes.filter(n=>n.kind==="top").slice(0,2).map(n=>({name:n.name,nameAr:n.nameAr})),
    keywords:[p.slug,p.lineupTitle,p.lineupTitleAr,...p.categorySlugs,...p.notes.flatMap(n=>[n.name,n.nameAr]),...p.variants.map(v=>v.title)].filter(Boolean).join(" ") };
}
export function createSearchIndex(documents: SearchDocument[]) {
  const engine = new MiniSearch<SearchDocument>({fields:["title","titleAr","keywords"],
    processTerm:term=>term.normalize("NFKD").replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").toLowerCase(),
    searchOptions:{prefix:true, fuzzy:term=>term.length>3?0.2:false, combineWith:"AND", boost:{title:5,titleAr:5,keywords:1}}});
  engine.addAll(documents);
  const byId = new Map(documents.map(d=>[d.id,d]));
  return { search:(query:string, limit=1000) => engine.search(query.slice(0,160)).slice(0,limit).map(r=>byId.get(String(r.id))!).filter(Boolean) };
}
