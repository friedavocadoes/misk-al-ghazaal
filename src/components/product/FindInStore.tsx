import { MapPin, ArrowUpRight, Phone, Clock, Store } from "lucide-react";
import { getProductRetailStores } from "@/lib/retail-stores";
import { storeMapUrl, type RetailStore } from "@/lib/retail-store-model";

function StoreCard({store,ar}:{store:RetailStore;ar:boolean}) {
  const text=(en:string,arabic?:string|null)=>ar && arabic ? arabic : en;
  const phone=store.phone.replace(/[^+\d]/g,"");
  return <article className="group flex h-full flex-col rounded-xl border border-ink/10 bg-white/70 p-5 transition duration-300 hover:border-gold/35 hover:bg-white hover:shadow-[0_12px_35px_-24px_rgba(60,45,25,.35)] sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[.18em] text-gold">{text(store.location,store.location_ar)}</span><Store className="size-4 text-gold/65" strokeWidth={1.2}/></div>
    <h3 className="text-lg font-light leading-snug tracking-tight text-ink">{text(store.name,store.name_ar)}</h3>
    <p className="mt-2 text-sm leading-relaxed text-ink/55">{text(store.address,store.address_ar)}</p>
    {store.hours && <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink/55"><Clock className="mt-0.5 size-3.5 shrink-0"/>{text(store.hours,store.hours_ar)}</p>}
    <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6">
      <a href={storeMapUrl(store)} target="_blank" rel="noopener noreferrer" aria-label={`${ar?"الاتجاهات إلى":"Directions to"} ${text(store.name,store.name_ar)}`} className="inline-flex items-center gap-2 border-b border-gold/35 pb-1 text-[11px] font-medium uppercase tracking-[.12em] text-ink transition hover:border-ink hover:text-gold">{ar?"الاتجاهات":"Get directions"}<ArrowUpRight className="size-3.5"/></a>
      {phone && <a href={`tel:${phone}`} aria-label={`${ar?"اتصل بـ":"Call"} ${text(store.name,store.name_ar)}`} className="inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-ink"><Phone className="size-3.5"/>{ar?"اتصل بالمتجر":"Call store"}</a>}
    </div>
  </article>;
}
export function RetailStoresSection({stores,ar=false}:{stores:RetailStore[];ar?:boolean}) {
  if(!stores.length)return null;
  return <section id="find-in-store" aria-labelledby="find-in-store-heading" className="my-12 scroll-mt-28 rounded-2xl border border-gold/15 bg-[#f0ece3]/60 p-5 sm:p-8 lg:my-16 lg:p-10">
    <div className="grid gap-7 lg:grid-cols-[.7fr_1.3fr] lg:gap-12">
      <div className="flex flex-col items-start"><span className="mb-5 flex size-11 items-center justify-center rounded-full border border-gold/25 text-gold"><MapPin className="size-5" strokeWidth={1.2}/></span><h2 id="find-in-store-heading" className="text-3xl font-light tracking-[-.035em] sm:text-4xl">{ar?"اكتشفه في المتجر":"Find in store"}</h2><p className="mt-3 max-w-60 text-sm leading-relaxed text-ink/55">{ar?"اكتشف العطر بنفسك في أحد متاجرنا.":"Discover the scent in person."}</p></div>
      <div className={stores.length>1?"grid gap-3 sm:grid-cols-2":"grid gap-3"}>{stores.slice(0,4).map(s=><StoreCard key={s.id} store={s} ar={ar}/>)}</div>
    </div>
    {stores.length>4 && <details className="mt-5 border-t border-ink/10 pt-4"><summary className="cursor-pointer text-center text-xs text-ink/65">{ar?`عرض ${stores.length-4} متاجر أخرى`:`View ${stores.length-4} more stores`}</summary><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{stores.slice(4).map(s=><StoreCard key={s.id} store={s} ar={ar}/>)}</div></details>}
  </section>;
}
export async function FindInStore({productId,locale}:{productId:string;locale:string}) {
  return <RetailStoresSection stores={await getProductRetailStores(productId)} ar={locale==="ar"}/>;
}
