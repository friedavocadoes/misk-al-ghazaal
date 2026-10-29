import { getAdminSession } from "@/lib/admin-auth";
export async function GET() {
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin")
    return new Response(null, { status: 403 });
  return new Response("\uFEFFemail,name,location,phone,marketing_consent\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="misk-leads-template.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
