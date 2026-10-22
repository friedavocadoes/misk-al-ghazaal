import { NextResponse } from "next/server";
import { getSearchProducts } from "@/lib/store";
import { searchDocument } from "@/lib/search-index";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const admin = new URL(req.url).searchParams.get("scope") === "admin";
  if(admin && (await getAdminSession())?.role !== "super_admin") return NextResponse.json({error:"forbidden"},{status:403});
  try {
    const products = await getSearchProducts(admin);
    return NextResponse.json({items:products.map(searchDocument)}, {headers:{"Cache-Control":"private, no-cache"}});
  } catch { return NextResponse.json({error:"Search is temporarily unavailable"},{status:503}); }
}
