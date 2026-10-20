"use client";
import { useEffect,useState,type CSSProperties } from "react";
import { useRouter,Link } from "@/i18n/navigation";
import { Star } from "lucide-react";
export function ReviewForm({productId,productSlug,locale}:{productId:string;productSlug:string;locale:string}){
 const ar=locale==="ar"; const router=useRouter();const [rating,setRating]=useState(0);const [step,setStep]=useState("rate");const [logged,setLogged]=useState(false);const [text,setText]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{let alive=true;fetch(`/api/reviews?productId=${productId}`).then(r=>r.json()).then(j=>{if(!alive)return;setLogged(j.loggedIn);if(j.rating){setRating(j.rating);setStep("ask");}if(j.review?.body)setText(j.review.body);}).catch(()=>{});return()=>{alive=false;};},[productId]);
 async function save(n:number,body=""){
 setBusy(true);setError("");try{const r=await fetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,rating:n,body})});if(!r.ok)throw Error();setRating(n);setStep(body?"done":"ask");router.refresh();}catch{setError(ar?"تعذر الحفظ. حاول مجدداً.":"Couldn’t save. Please try again.");}finally{setBusy(false);}}
 return <div className="rating-glass" style={{"--rating-gold":`${rating*9}%`} as CSSProperties} aria-busy={busy}>
 <p className="eyebrow">{ar?"انطباعك يهمنا":"A moment for your impression"}</p><h3>{step==="write"?(ar?"احكِ لنا عن تجربتك":"Tell us a little more."):step==="done"?(ar?"شكراً لمشاركتك":"Thank you for sharing."):(ar?"كيف وجدت هذا العطر؟":"How did this scent feel?")}</h3>
 <div className="rating-stars" role="group" aria-label={ar?"التقييم":"Rate this fragrance"}>{[1,2,3,4,5].map(n=><button key={n} disabled={busy} aria-label={`${n} / 5`} aria-pressed={rating===n} onClick={()=>void save(n)}><Star fill={n<=rating?"currentColor":"none"}/></button>)}</div>
 {step==="rate"&&<p>{ar?"لمسة واحدة تكفي.":"One touch is all it takes."}</p>}
 {step==="ask"&&<div className="rating-stage"><p>{ar?"حُفظ تقييمك. هل تود كتابة مراجعة؟":"Your rating is saved. Would you like to add a few words?"}</p><div className="flex flex-wrap justify-center gap-4 mt-5">{logged?<button className="rating-primary" onClick={()=>setStep("write")}>{ar?"اكتب مراجعة":"Yes, share my experience"}</button>:<Link className="rating-primary" href={`/account/login?next=${encodeURIComponent(`/product/${productSlug}#reviews`)}`}>{ar?"تسجيل الدخول للكتابة":"Sign in to write a review"}</Link>}<button onClick={()=>setStep("thanks")}>{ar?"ليس الآن":"Not now"}</button></div></div>}
 {step==="write"&&<form className="rating-stage" onSubmit={e=>{e.preventDefault();void save(rating,text);}}><label className="sr-only" htmlFor={`review-${productId}`}>{ar?"تجربتك":"Your experience"}</label><textarea id={`review-${productId}`} required maxLength={2000} rows={5} value={text} onChange={e=>setText(e.target.value)} placeholder={ar?"ما الذي أحببته؟":"What stayed with you?"}/><p>{ar?"تظهر المراجعات بعد الموافقة.":"Your words will appear after approval. Your rating is already counted."}</p><button className="rating-primary mt-5" disabled={busy}>{busy?(ar?"جارٍ الحفظ":"Saving…"):(ar?"إرسال المراجعة":"Send review")}</button></form>}
 {(step==="thanks"||step==="done")&&<p role="status">{step==="done"?(ar?"مراجعتك قيد الموافقة.":"Your review will be uploaded after profanity checks."):(ar?"حُفظ تقييمك. شكراً لك.":"Your rating is saved. Thank you.")}</p>}
 {error&&<p role="alert">{error}</p>}</div>;
}
