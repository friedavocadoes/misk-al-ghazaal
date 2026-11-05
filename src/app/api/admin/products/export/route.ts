import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { productWorkbook, type ExportProduct } from "@/lib/product-export";
import { logAdmin } from "@/lib/audit";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session)
    return Response.json(
      { error: "Sign in to export products" },
      { status: 401 },
    );
  if (session.role !== "super_admin")
    return Response.json({ error: "Not permitted" }, { status: 403 });
  try {
    const sb = await createClient(),
      products: ExportProduct[] = [];
    for (let start = 0; ; start += 500) {
      const { data, error } = await sb
        .from("products")
        .select(
          "id,title,slug,is_active,lineups(slug),product_notes(kind,position,notes(name))",
        )
        .is("deleted_at", null)
        .order("title")
        .order("id")
        .range(start, start + 499);
      if (error) throw new Error(error.message);
      products.push(...(data as unknown as ExportProduct[]));
      if (data.length < 500) break;
    }
    // Referrer is the admin page's actual origin, including localhost/preview hosts.
    const origin = new URL(request.headers.get("referer") || request.url)
      .origin;
    const bytes = await productWorkbook(products, origin);
    await logAdmin(sb, session, {
      category: "products",
      action: "export",
      entity: "products",
      summary: `Exported ${products.length} products to Excel`,
      details: { count: products.length, origin },
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="products.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Product export failed", error);
    return Response.json(
      { error: "Could not export products. Please try again." },
      { status: 500 },
    );
  }
}
