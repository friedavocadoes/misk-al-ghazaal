import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/service";
import { analyticsRange } from "@/lib/analytics/dashboard";

export async function GET(req:Request) {
 const session=await getAdminSession(true);
 if(!session || !["super_admin","content_editor"].includes(session.role))return NextResponse.json({error:"Forbidden"},{status:403});
 try {
  const params=new URL(req.url).searchParams; const kind=params.get("kind");const db=createAdminClient();
  let result;
  if(kind==="live")result=await db.rpc("analytics_live");
  else if(kind==="locations"){
   const country=(params.get("country")??"").toUpperCase();
   const emirate=(params.get("emirate")??"").toUpperCase();
   const city=(params.get("city")??"").trim();if(city.length>120||/[\u0000-\u001f]/.test(city))return NextResponse.json({error:"Choose a valid city."},{status:400});
   if((country&&!/^[A-Z]{2}$/.test(country))||(emirate&&!["AZ","DU","SH","AJ","UQ","RK","FU"].includes(emirate))||(emirate&&country!=="AE"))return NextResponse.json({error:"Choose a valid country and UAE emirate."},{status:400});
   result=await db.rpc("analytics_locations_city",{...analyticsRange(params),include_bots:params.get("bots")==="all",bots_only:params.get("bots")==="only",filter_country:country,filter_emirate:emirate,filter_city:city});
  }
  else if(kind==="customers"){
   if(session.role!=="super_admin")return NextResponse.json({error:"Customer data is restricted to super admins."},{status:403});
   result=await db.rpc("analytics_customers",{...analyticsRange(params),search_text:(params.get("q")??"").slice(0,100),page_offset:Math.max(0,Math.min(100000,Number(params.get("offset"))||0)),page_size:100,promo_filter:["yes","no"].includes(params.get("promo")??"")?params.get("promo"):"all"});
  }else result=await db.rpc("analytics_dashboard",{...analyticsRange(params),include_bots:params.get("bots")==="all",bots_only:params.get("bots")==="only",attribution:params.get("attribution")==="first"?"first":"last",compare:params.get("compare")!=="false"});
  if(result.error)throw new Error(kind==="locations"?"Location analytics unavailable. Apply migration_analytics_city_filter.sql after migration_paid_feedback.sql.":result.error.message);
  return NextResponse.json(result.data,{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){
  const text=error instanceof Error ? error.message : "Analytics unavailable. Apply migration_analytics.sql in Supabase.";
  return NextResponse.json({error:text},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
