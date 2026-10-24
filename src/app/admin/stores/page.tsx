import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, ArrowUpRight, Plus } from "lucide-react";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { RetailStoreFields } from "@/components/admin/retail-store-fields";
import { storeMapUrl, type RetailStore } from "@/lib/retail-store-model";
import { saveRetailStore } from "./actions";

export default async function StoresPage(){
  const session=await getAdminSession();if(!session)redirect("/admin/login");if(session.role!=="super_admin")redirect("/admin/orders");
  const db=await createClient();const {data,error}=await db.from("retail_stores").select("*").order("sort").order("name");
  return <><AdminNav email={session.email} role={session.role}/><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="eyebrow text-gold">Catalog / Stockists</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-light tracking-tight">Stores</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/55">Manage store details once. Choose the products each location carries, and every linked product page stays in sync.</p></div><a href="#new-store" className="flex items-center gap-2 rounded-md bg-ink px-4 py-3 text-sm text-white"><Plus className="size-4"/>Add store</a></div>
    {error?<p className="mt-8 rounded-lg border border-gold/30 bg-gold-wash/30 p-5 text-sm">Stores are not available yet. Apply <code>migration_retail_stores.sql</code>, then reload this page.</p>:<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(data as RetailStore[]).map(s=><article key={s.id} className="rounded-xl border border-ink/10 bg-white p-6"><div className="flex items-center justify-between"><MapPin className="size-5 text-gold" strokeWidth={1.3}/><span className={s.active?"text-[10px] uppercase tracking-widest text-[#3f6652]":"text-[10px] uppercase tracking-widest text-ink/40"}>{s.active?"Visible":"Paused"}</span></div><h2 className="mt-5 text-xl font-light">{s.name}</h2><p className="mt-2 text-sm text-ink/55">{s.location}</p><p className="mt-2 text-xs leading-relaxed text-ink/45">{s.address}</p><p className="mt-5 border-t border-ink/10 pt-4 text-xs text-ink/55">{s.all_products?"All products · exceptions supported":"Selected products"}</p><div className="mt-5 flex items-center justify-between gap-4"><Link href={`/admin/stores/${s.id}`} className="text-sm underline underline-offset-4">Details & products</Link><a href={storeMapUrl(s)} target="_blank" rel="noopener noreferrer" aria-label={`Open map for ${s.name}`} className="text-gold"><ArrowUpRight className="size-4"/></a></div></article>)}</div>}
    <section id="new-store" className="mt-10 scroll-mt-24 rounded-xl border border-ink/10 bg-white p-5 sm:p-7"><h2 className="mb-6 text-2xl font-light">New store</h2><AdminForm action={saveRetailStore} success="Store created" className="grid gap-5 sm:grid-cols-2"><RetailStoreFields/><SaveButton className="sm:col-span-2">Create store & choose products</SaveButton></AdminForm></section>
  </main></>;
}
