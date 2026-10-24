"use client";
import { useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import { AdminForm, SaveButton } from "./admin-form";
import { assignRetailStore } from "@/app/admin/stores/actions";

export interface AssignableProduct {id:string;title:string;slug:string;lineup_id?:string|null;collectionIds:string[];assigned:boolean}
export function StoreProductAssignment({storeId,allProducts,products,collections,lineups}:{storeId:string;allProducts:boolean;products:AssignableProduct[];collections:{id:string;title:string}[];lineups:{id:string;title:string}[]}) {
  const [query,setQuery]=useState(""),[collection,setCollection]=useState(""),[lineup,setLineup]=useState(""),[status,setStatus]=useState("all");
  const [selected,setSelected]=useState<string[]>([]);const field=useRef<HTMLInputElement>(null);
  const visible=products.filter(p=>(!query||`${p.title} ${p.slug}`.toLowerCase().includes(query.toLowerCase()))&&(!collection||p.collectionIds.includes(collection))&&(!lineup||p.lineup_id===lineup)&&(status==="all"||(status==="assigned")===p.assigned));
  const update=(ids:string[])=>{setSelected(ids);requestAnimationFrame(()=>field.current?.dispatchEvent(new Event("input",{bubbles:true})));};
  const selectVisible=()=>update([...new Set([...selected,...visible.map(p=>p.id)])]);
  const select="rounded-md border border-ink/15 bg-white px-3 py-2.5 text-xs";
  return <section className="mt-8 rounded-xl border border-ink/10 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-light">Product availability</h2><p className="mt-2 text-sm text-ink/55">{allProducts?"All current and future products are included. Remove selected products to make exceptions.":"Choose the products this store carries. Add or remove several in one save."}</p></div><span className="text-xs text-ink/55">{products.filter(p=>p.assigned).length} / {products.length} assigned</span></div>
    <div className="my-5 flex flex-wrap gap-2"><label className="flex min-w-48 flex-1 items-center gap-2 rounded-md border border-ink/15 px-3"><Search className="size-4 text-ink/40"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find products…" aria-label="Search products to assign" className="min-w-0 flex-1 py-2.5 text-sm outline-none"/></label><select aria-label="Filter collection" value={collection} onChange={e=>setCollection(e.target.value)} className={select}><option value="">All collections</option>{collections.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><select aria-label="Filter lineup" value={lineup} onChange={e=>setLineup(e.target.value)} className={select}><option value="">All lineups</option>{lineups.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select><select aria-label="Filter assignment" value={status} onChange={e=>setStatus(e.target.value)} className={select}><option value="all">All products</option><option value="assigned">Assigned</option><option value="unassigned">Not assigned</option></select></div>
    <AdminForm action={assignRetailStore} success="Store availability updated">
      <input name="store_id" type="hidden" value={storeId}/><input ref={field} name="product_ids" type="hidden" value={JSON.stringify(selected)}/>
      <div className="flex flex-wrap items-center gap-3 border-y border-ink/10 bg-cream/40 px-3 py-3 text-xs"><button type="button" onClick={selectVisible} className="underline underline-offset-4">Select {visible.length} shown</button><button type="button" onClick={()=>update([])} className="text-ink/50 hover:text-ink">Clear selection</button><span className="ms-auto">{selected.length} selected</span></div>
      <div className="max-h-[480px] overflow-y-auto divide-y divide-ink/10">{visible.map(p=><label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-3.5 text-sm hover:bg-cream/50"><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>update(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/><span className="min-w-0 flex-1 truncate">{p.title}</span><span className={p.assigned?"flex items-center gap-1 text-[10px] text-[#3f6652]":"text-[10px] text-ink/40"}>{p.assigned?<><Check className="size-3"/>Assigned</>:"Not assigned"}</span></label>)}{!visible.length&&<p className="py-8 text-center text-sm text-ink/50">No products match these filters.</p>}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4"><select name="available" aria-label="Assignment action" className={select}><option value="true">Add selected to this store</option><option value="false">Remove selected from this store</option></select><SaveButton>Apply to selected</SaveButton></div>
    </AdminForm>
  </section>;
}
