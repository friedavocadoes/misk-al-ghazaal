"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { ArrowRight,Check,Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSection({
  eyebrow,
  title,
  text,
  placeholder,
  join,
}: {
  eyebrow: string;
  title: string;
  text: string;
  placeholder: string;
  join: string;
}) {
  const ar=useLocale()==="ar",[step,setStep]=useState(0),[email,setEmail]=useState(""),[name,setName]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  return <section className="border-b border-ink/10 bg-[#eee9df] px-5 py-12 md:py-20">
    <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center md:gap-20">
      <div><p className="eyebrow text-gold">{eyebrow}</p><h2 className="mt-4 max-w-md text-3xl font-light leading-tight tracking-tight md:text-5xl">{title}</h2><p className="mt-4 max-w-sm text-sm leading-7 text-espresso">{text}</p></div>
      <div className="min-w-0 border-s border-ink/15 ps-6 md:ps-10">
       {step===2?<div role="status" className="py-6"><Check strokeWidth={1} className="size-8 text-gold"/><p className="mt-5 text-2xl font-light">{ar?"سعدنا بانضمامك.":"A little closer to the maison."}</p><p className="mt-3 text-sm leading-7 text-fog">{ar?"شكراً لك. نحترم دائماً تفضيلات رسائلك.":"Thank you. Your communication preferences are always respected."}</p></div>:<form onSubmit={async e=>{e.preventDefault();setError("");if(step===0){setStep(1);return;}setBusy(true);try{const r=await fetch("/api/newsletter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,name})});const d=await r.json();if(!r.ok)throw Error(d.error);setStep(2);}catch(e){setError(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}}}>
        <div className="mb-7 flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-fog"><span>{ar?"رسائل مختارة لك":"Letters, considered."}</span><span>{step+1} / 2</span></div>
        <label className="block text-lg font-light" htmlFor="newsletter-field">{step===0?(ar?"أين نراسلك؟":"Where shall we write?"):(ar?"بأي اسم نخاطبك؟":"And your name?")}</label>
        {step===0?<Input id="newsletter-field" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={placeholder} className="mt-4 h-14 border-0 border-b border-ink/25 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"/>:<Input autoFocus key="name" id="newsletter-field" type="text" required maxLength={150} autoComplete="given-name" value={name} onChange={e=>setName(e.target.value)} placeholder={ar?"الاسم":"Your name"} className="mt-4 h-14 border-0 border-b border-ink/25 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"/>}
        <p className="mt-5 text-xs leading-6 text-fog">{ar?"بانضمامك، توافق على تلقي العروض والإصدارات الجديدة عبر البريد. يمكنك إلغاء الاشتراك في أي وقت.":"Join for new arrivals and private offers by email. Unsubscribe whenever you wish."}</p>
        {error&&<p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex items-center justify-between gap-5">{step===1&&<button type="button" onClick={()=>setStep(0)} className="text-xs underline">{ar?"تعديل البريد":"Edit email"}</button>}<Button type="submit" disabled={busy} className="ms-auto min-w-36 px-6">{busy?<Loader2 className="size-4 animate-spin"/>:step===0?(ar?"متابعة":"Continue"):join}{!busy&&<ArrowRight className="ms-4 size-4 rtl:rotate-180"/>}</Button></div>
       </form>}
      </div>
    </div>
  </section>;
}
