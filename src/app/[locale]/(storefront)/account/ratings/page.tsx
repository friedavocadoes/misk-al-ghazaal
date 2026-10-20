import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { requireShopper } from "@/lib/shopper";
import { createAdminClient } from "@/lib/supabase/service";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/lib/i18n";
export default async function Ratings({params}:{params:Promise<{locale:string}>}){
 const locale=toLocale((await params).locale);setRequestLocale(locale);const ar=locale==="ar";const session=await requireShopper();
 if(!session)return <div className="p-16 text-center"><Link href="/account/login?next=%2Faccount%2Fratings">{ar?"تسجيل الدخول":"Sign in to see your ratings"}</Link></div>;
 const admin=createAdminClient();const guest=(await cookies()).get("misk-rating-browser")?.value;
 if(guest && /^[0-9a-f-]{36}$/i.test(guest))await admin.rpc("claim_browser_ratings",{gid:guest,uid:session.user.id});
 const [{data:ratings,error},{data:reviews}]=await Promise.all([session.supabase.from("product_ratings").select("id,product_id,rating,created_at,products(title,slug)").eq("user_id",session.user.id).order("created_at",{ascending:false}),session.supabase.from("reviews").select("product_id,title,body,approved").eq("user_id",session.user.id)]);
 return <section className="mx-auto max-w-4xl px-5 py-16"><p className="eyebrow text-gold">{ar?"انطباعاتك":"Your impressions"}</p><h1 className="mt-4 text-4xl font-light">{ar?"تقييماتي ومراجعاتي":"My ratings & reviews"}</h1>{error?<p className="mt-10">{ar?"التقييمات غير متاحة حالياً.":"Ratings are temporarily unavailable."}</p>:!ratings?.length?<p className="mt-10 text-fog">{ar?"لم تقيّم أي عطر بعد.":"Your scent story is waiting for its first impression."}</p>:<ul className="review-gallery mt-10">{ratings.map(r=>{const p=Array.isArray(r.products)?r.products[0]:r.products;const review=reviews?.find(v=>v.product_id===r.product_id);return <li key={r.id}><p className="text-gold">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</p><Link href={`/product/${p?.slug}#reviews`} className="mt-4 block text-xl">{p?.title}</Link>{review?.body&&<p className="mt-4 whitespace-pre-wrap text-sm leading-7">{review.body}</p>}<p className="mt-5 text-xs text-fog">{review?(review.approved?(ar?"منشورة":"Review published"):(ar?"قيد الموافقة":"Review awaiting approval")):(ar?"تقييم فقط":"Rating only")}</p><Link className="mt-5 inline-block text-xs underline" href={`/product/${p?.slug}#reviews`}>{ar?"تعديل":"Edit your impression"}</Link></li>})}</ul>}</section>;
}
