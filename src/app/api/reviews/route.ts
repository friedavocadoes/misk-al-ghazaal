import { after } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service";
import { touchProduct } from "@/lib/revalidate";
const COOKIE = "misk-rating-browser";
async function context() {
 const client=await createClient(); const {data:{user}}=await client.auth.getUser();
 const jar=await cookies(); const raw=jar.get(COOKIE)?.value;
 const guest=raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : randomUUID();
 jar.set(COOKIE,guest,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:31536000});
 const admin=createAdminClient();
 if(user){const {error}=await admin.rpc("claim_browser_ratings",{gid:guest,uid:user.id});if(error)throw error;}
 return {user,guest,admin};
}
export async function GET(req:Request){
 try {const {user,guest,admin}=await context(); const pid=new URL(req.url).searchParams.get("productId");
 let q=admin.from("product_ratings").select("rating"); q=user?q.eq("user_id",user.id):q.eq("browser_id",guest);
 if(pid)q=q.eq("product_id",pid);
 const {data,error}=await q; if(error)throw error;
 const review=user&&pid ? await admin.from("reviews").select("title,body,approved").eq("product_id",pid).eq("user_id",user.id).maybeSingle():null;
 return NextResponse.json({loggedIn:!!user,rating:data?.[0]?.rating??0,review:review?.data??null},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Ratings unavailable. Please try again."},{status:503});}
}
export async function POST(req:Request){
 if(req.headers.get("origin") && req.headers.get("origin")!==new URL(req.url).origin)return NextResponse.json({error:"origin"},{status:403});
 try {
 const body=await req.json(); const rating=Number(body.rating);const pid=String(body.productId??"");
 if(!Number.isInteger(rating)||rating<1||rating>5||! /^[0-9a-f-]{36}$/i.test(pid))return NextResponse.json({error:"Invalid rating"},{status:400});
 const {user,guest,admin}=await context();
 const {data:product}=await admin.from("products").select("id").eq("id",pid).is("deleted_at",null).maybeSingle();
 if(!product)return NextResponse.json({error:"Product unavailable"},{status:404});
 let q=admin.from("product_ratings").select("id,user_id").eq("product_id",pid);q=user?q.eq("user_id",user.id):q.eq("browser_id",guest);
 const {data:existing}=await q.limit(1).maybeSingle();

 // A second submission edits one vote, never adds another.
 const result=existing ? await admin.from("product_ratings").update({rating}).eq("id",existing.id):await admin.from("product_ratings").insert({product_id:pid,rating,...(user?{user_id:user.id,browser_id:guest}:{guest_id:guest,browser_id:guest})});
 if(result.error)throw result.error;
 const text=String(body.body??"").trim().slice(0,2000);const title=String(body.title??"").trim().slice(0,80);
 if(text||title){
 if(!user)return NextResponse.json({error:"Sign in to write a review"},{status:401});
 const {error}=await admin.from("reviews").upsert({product_id:pid,user_id:user.id,rating,title,body:text,approved:false},{onConflict:"product_id,user_id"});if(error)throw error;
 }
 after(async()=>{await touchProduct(admin,pid);});
 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Unable to save. Please try again."},{status:503});}
}
