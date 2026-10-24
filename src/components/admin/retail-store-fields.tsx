import type { RetailStore } from "@/lib/retail-store-model";
const input="mt-1.5 w-full rounded-md border border-ink/15 bg-white px-3 py-2.5 text-sm focus:border-gold focus:outline-none";
export function RetailStoreFields({store}:{store?:RetailStore}) {
  return <>
    <input type="hidden" name="id" value={store?.id??""}/>
    <label className="text-xs text-ink/65">Store name *<input name="name" required maxLength={180} defaultValue={store?.name??""} className={input}/></label>
    <label className="text-xs text-ink/65">City / area<input name="location" maxLength={120} defaultValue={store?.location??""} placeholder="e.g. Dubai · Al Mamzar" className={input}/></label>
    <label className="text-xs text-ink/65 sm:col-span-2">Address<input name="address" maxLength={500} defaultValue={store?.address??""} className={input}/></label>
    <label className="text-xs text-ink/65 sm:col-span-2">Google Maps link<input name="maps_url" type="url" maxLength={2000} defaultValue={store?.maps_url??""} placeholder="Optional — uses the name and address if blank" className={input}/></label>
    <label className="text-xs text-ink/65">Phone<input name="phone" type="tel" maxLength={40} defaultValue={store?.phone??""} className={input}/></label>
    <label className="text-xs text-ink/65">Opening hours<input name="hours" maxLength={180} defaultValue={store?.hours??""} placeholder="Optional" className={input}/></label>
    <details className="sm:col-span-2"><summary className="cursor-pointer text-xs text-ink/55">Arabic details (optional)</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{[["name_ar","Store name"],["location_ar","City / area"],["address_ar","Address"],["hours_ar","Opening hours"]].map(([key,label])=><label key={key} className="text-xs text-ink/65">{label}<input name={key} dir="rtl" maxLength={key==="address_ar"?500:180} defaultValue={String(store?.[key as keyof RetailStore]??"")} className={input}/></label>)}</div></details>
    <div className="flex flex-wrap items-center gap-5 border-t border-ink/10 pt-4 sm:col-span-2">
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={store?.active??true}/>Visible on product pages</label>
      <label className="flex items-center gap-2 text-sm"><input name="all_products" type="checkbox" defaultChecked={store?.all_products??false}/>Carries all products, including future additions</label>
      <label className="flex items-center gap-2 text-xs text-ink/65">Display order<input name="sort" type="number" step="1" defaultValue={store?.sort??0} className="w-20 rounded-md border border-ink/15 bg-white px-2 py-2"/></label>
    </div>
  </>;
}
