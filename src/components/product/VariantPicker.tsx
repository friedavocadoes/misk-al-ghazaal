"use client";
import type { Product, Variant } from "@/lib/types";
import { stockAvailable } from "@/lib/product-options";
import { cn } from "@/lib/utils";

export function VariantPicker({product,variant,onSelect,ar=false}:{product:Product;variant?:Variant;onSelect:(id:string)=>void;ar?:boolean}) {
  const groups=[...new Set(product.variants.map(v=>v.concentration??""))];
  const concentration=variant?.concentration??"";
  const options=product.variants.filter(v=>(v.concentration??"")===concentration);
  if(product.variants.length===0)return null;
  const button="relative border px-4 py-3 text-[12px] transition duration-300 motion-reduce:transition-none";
  return <div className="mt-6 space-y-4">
    {(groups.length>1||groups[0])&&<fieldset><legend className="mb-2 text-[10px] uppercase tracking-[.18em] text-ink/50">{ar?"التركيز":"Concentration"}</legend><div className="flex flex-wrap gap-2">{groups.map(group=><button data-ios-haptic="on" type="button" key={group} aria-pressed={group===concentration} onClick={()=>{const matching=product.variants.filter(v=>(v.concentration??"")===group);const next=matching.find(v=>v.capacityMl===variant?.capacityMl)??matching.find(v=>stockAvailable(v.stock))??matching[0];if(next)onSelect(next.id);}} className={cn(button,group===concentration?"border-ink bg-ink text-white":"border-ink/15 hover:border-gold")}>{group||(ar?"خيارات أخرى":"Other options")}</button>)}</div></fieldset>}
    <fieldset><legend className="mb-2 text-[10px] uppercase tracking-[.18em] text-ink/50">{ar?"الحجم":"Size"}</legend><div className="flex flex-wrap gap-2">{options.map(v=><button data-ios-haptic="on" type="button" key={v.id} onClick={()=>onSelect(v.id)} aria-pressed={v.id===variant?.id} className={cn(button,"min-w-20",v.id===variant?.id?"border-gold bg-gold-wash/50 ring-1 ring-gold/20":"border-ink/15 hover:border-gold",(product.outOfStock||!stockAvailable(v.stock))&&"text-ink/45")}><span>{v.capacityMl?`${v.capacityMl} ml`:v.title}</span>{(product.outOfStock||!stockAvailable(v.stock))&&<span className="mt-1 block text-[9px] text-red-700">{ar?"نفد المخزون":"Out of stock"}</span>}</button>)}</div></fieldset>
  </div>;
}
