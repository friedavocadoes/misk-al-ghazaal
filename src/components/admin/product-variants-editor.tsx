"use client";

import { useRef, useState } from "react";
import { Plus, Layers, ImageIcon } from "lucide-react";
import { AdminForm, SaveButton, ActionButton } from "./admin-form";
import { MultiImageUploader } from "./multi-image-uploader";
import { CONCENTRATIONS } from "@/lib/product-options";
import { saveProductVariant, archiveProductVariant } from "@/app/admin/products/option-actions";

export interface EditableVariant {id:string;title:string;price:number;stock:number|null;sku?:string|null;concentration?:string|null;capacity_ml?:number|null;name_override?:string|null;images?:string[];use_product_images?:boolean;is_active?:boolean}
const input="mt-1.5 w-full border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-gold";
function VariantForm({productId,variant,price}:{productId:string;variant?:EditableVariant;price:number}) {
  const [shared,setShared]=useState(variant?.use_product_images!==false);
  const [images,setImages]=useState<string[]>(variant?.images??[]);
  const [concentration,setConcentration]=useState(variant?.concentration??"");
  const imageField=useRef<HTMLInputElement>(null);
  return <AdminForm action={saveProductVariant} success={variant?"Option saved":"Option added"} className="space-y-5 border border-ink/10 bg-white p-5 sm:p-6">
    <input type="hidden" name="product_id" value={productId}/><input type="hidden" name="variant_id" value={variant?.id??""}/>
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{variant?.title??"New option"}</p>{variant && <span className={(variant.stock==null||variant.stock>0)?"text-xs text-ink/50":"text-xs text-red-700"}>{(variant.stock==null||variant.stock>0)?(variant.stock==null?"Unlimited stock":`${variant.stock} in stock`):"Out of stock"}</span>}</div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs text-ink/65">Concentration<select name="concentration" value={concentration} onChange={e=>setConcentration(e.target.value)} className={input}><option value="">No concentration / other product</option>{CONCENTRATIONS.map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="text-xs text-ink/65">Capacity (ml)<input name="capacity_ml" type="number" min="0.1" step="0.1" required={!!concentration} defaultValue={variant?.capacity_ml??""} placeholder="e.g. 100" className={input}/></label>
      <label className="text-xs text-ink/65">Price (AED)<input name="v_price" type="number" min="0.01" step="0.01" required defaultValue={variant?.price??price} className={input}/></label>
      <label className="text-xs text-ink/65">Available stock (blank = unlimited)<input name="v_stock" type="number" min="0" step="1" placeholder="Unlimited" defaultValue={variant?.stock??""} className={input}/></label>
      <label className="text-xs text-ink/65">Product name override (optional)<input name="name_override" defaultValue={variant?.name_override??""} placeholder="Uses the product name" className={input}/></label>
      <label className="text-xs text-ink/65">SKU (optional)<input name="v_sku" defaultValue={variant?.sku??""} className={input}/></label>
      <label className="text-xs text-ink/65 sm:col-span-2">Custom option label (for incense, grams or legacy options)<input name="custom_label" defaultValue={variant?.title??""} placeholder="e.g. 100 g — used when concentration and ml are empty" className={input}/></label>
    </div>
    <fieldset className="border-t border-ink/10 pt-4"><legend className="text-xs text-ink/65">Photography</legend><div className="mt-2 flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="radio" name="use_product_images" value="true" checked={shared} onChange={()=>setShared(true)}/><Layers className="size-4 text-gold"/>Use product gallery</label>
      <label className="flex items-center gap-2"><input type="radio" name="use_product_images" value="false" checked={!shared} onChange={()=>setShared(false)}/><ImageIcon className="size-4 text-gold"/>Own images</label>
    </div></fieldset>
    <input ref={imageField} type="hidden" name="images" value={JSON.stringify(images)}/>
    {!shared && <MultiImageUploader bucket="products" prefix={`${productId}-variant`} images={images} onChange={next=>{setImages(next);requestAnimationFrame(()=>imageField.current?.dispatchEvent(new Event("input",{bubbles:true})));}}/>}
    <SaveButton>{variant?"Save option":"Add option"}</SaveButton>
  </AdminForm>;
}
export function ProductVariantsEditor({productId,variants,price}:{productId:string;variants:EditableVariant[];price:number}) {
  const [adding,setAdding]=useState(false);
  const active=variants.filter(v=>v.is_active!==false);
  const archived=variants.filter(v=>v.is_active===false);
  return <div className="space-y-4"><p className="max-w-2xl text-sm leading-relaxed text-ink/60">Each card is one purchasable combination. Add EDP 50 ml and EDP 100 ml separately; EDT can have its own sizes. Photography follows the selected option.</p>
    {active.map(v=><div key={v.id}><VariantForm key={`${v.id}:${v.price}:${v.stock}:${v.title}:${JSON.stringify(v.images)}`} productId={productId} variant={v} price={price}/>{active.length>1&&<form action={archiveProductVariant} className="flex justify-end border-x border-b border-ink/10 bg-cream/40 p-2"><input type="hidden" name="product_id" value={productId}/><input type="hidden" name="variant_id" value={v.id}/><ActionButton danger>Archive option</ActionButton></form>}</div>)}
    <button type="button" onClick={()=>setAdding(!adding)} className="flex w-full items-center justify-center gap-2 border border-dashed border-gold/50 bg-gold-wash/20 py-4 text-sm text-ink hover:bg-gold-wash/50"><Plus className="size-4"/>{adding?"Close new option":"Add variant"}</button>
    {!!archived.length && <details className="border border-ink/10 p-4"><summary className="cursor-pointer text-sm text-ink/55">Archived options ({archived.length})</summary><p className="my-3 text-xs text-ink/50">Edit and save an archived option to restore it. Its original ID and gallery are preserved.</p>{archived.map(v=><VariantForm key={v.id} productId={productId} variant={v} price={price}/>)}</details>}
    {adding && <VariantForm key={active.length} productId={productId} price={price}/>}
  </div>;
}
