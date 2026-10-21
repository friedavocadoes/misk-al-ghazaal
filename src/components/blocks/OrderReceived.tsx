"use client";
import { useEffect } from "react";
import { Check, Clock3, PackageCheck, Truck, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import { formatAED } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
export type ReceivedOrder = {orderNo:string;total:number;items:{title:string;qty:number;unit:number;slug:string;image:string}[]};
export function OrderReceived({order,locale,loggedIn}:{order:ReceivedOrder;locale:Locale;loggedIn:boolean}) {
 const ar=locale==="ar";
 useEffect(() => { window.scrollTo({top:0, behavior:"instant"}); }, []);
 return <section className="order-received mx-auto max-w-5xl px-5 py-10 md:py-16">
  <div className="order-received-intro"><span className="order-received-seal"><Check size={28} strokeWidth={1.2}/></span><p className="eyebrow mt-6 text-gold">{ar?"بداية رحلتك العطرية":"Your next scent story"}</p><h1 className="mt-3 text-3xl font-light tracking-tight md:text-5xl">{ar?"شكراً. وصلنا طلبك.":"Thank you. Your order is with us."}</h1><p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-espresso">{ar?"طلبك بانتظار تأكيد فريقنا. سنوافيك بالتحديثات بعد التأكيد، ثم أثناء التجهيز والتوصيل.":"Our team will review and confirm your order. You’ll receive updates once it’s confirmed, then as we prepare it and send it on its way."}</p></div>
  <div className="order-received-grid mt-9">
   <section className="order-received-bag"><div className="flex flex-wrap justify-between gap-3 border-b border-ink/10 pb-5"><h2 className="text-lg">{ar?"اختياراتك":"Your selection"}</h2><span className="text-xs text-gold">{order.orderNo}</span></div><ul>{order.items.map((l,i)=><li key={`${l.slug}-${i}`} className="flex items-center gap-4 border-b border-ink/10 py-4">{l.image&&<SafeImage src={l.image} fallback="" width={64} height={80} sizes="64px" alt="" className="h-20 w-16 rounded-md object-cover"/>}<div className="min-w-0 flex-1">{l.slug==="sample"?<span className="text-sm">{l.title}</span>:<Link href={`/product/${l.slug}`} className="text-sm">{l.title}</Link>}<p className="mt-2 text-xs text-fog">{ar?"الكمية":"Quantity"} {l.qty}</p></div><span className="text-xs">{formatAED(l.unit*l.qty)}</span></li>)}</ul><div className="mt-5 flex justify-between"><span className="text-sm">{ar?"الإجمالي · الدفع عند الاستلام":"Total · cash on delivery"}</span><strong className="text-lg font-medium">{formatAED(order.total)}</strong></div></section>
   <aside className="order-received-next"><h2 className="text-lg">{ar?"ما الخطوة التالية؟":"What happens next"}</h2>{[[Clock3,ar?"تأكيد الفريق":"Team confirmation",ar?"نراجع طلبك أولاً.":"We’ll review your order first."],[PackageCheck,ar?"تجهيز بعناية":"Prepared with care",ar?"نجهّز اختياراتك بعد التأكيد.":"Your selection is packed after confirmation."],[Truck,ar?"في الطريق إليك":"On its way",ar?"سنوافيك بتحديث التوصيل.":"We’ll keep you informed about delivery."]].map(([Icon,title,text],i)=>{const I=Icon as typeof Clock3;return <div key={i} className="mt-6 flex gap-3"><span className={`order-next-icon ${i===0?"is-current":""}`}><I size={19} strokeWidth={1.3}/></span><div><h3 className="text-sm">{title as string}</h3><p className="mt-1 text-xs leading-6 text-fog">{text as string}</p></div></div>;})}<Link href={loggedIn?"/account/orders":"/account/login?next=/account/orders"} className="mt-7 flex items-center justify-between rounded-lg bg-ink px-4 py-3 text-xs text-white">{ar?"عرض طلباتي":"View my orders"}<ArrowUpRight size={15}/></Link></aside>
  </div><div className="mt-8 text-center"><Link href="/collection/all" className="link-underline text-xs">{ar?"متابعة الاكتشاف":"Continue exploring"}</Link></div>
 </section>;
}
