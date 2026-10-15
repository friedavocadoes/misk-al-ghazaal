import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, SaveButton } from "@/components/admin/admin-form";
import { logAdmin } from "@/lib/audit";
import { getHelloProducts } from "@/lib/email-settings";
import { mailboxAddress } from "@/lib/mailer";

async function saveHello(formData: FormData) {
  "use server";
  const s = await getAdminSession();
  if (!s || s.role !== "super_admin") redirect("/admin/login");
  const supabase = await createClient();
  const slugsRaw = String(formData.get("product_slugs") ?? "");
  const slugs = slugsRaw
    .split(",")
    .map((x) => x.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean)
    .slice(0, 3);
  const row = {
    subject: String(formData.get("subject") ?? "").trim() || "Welcome to the Maison — Misk Al Ghazaal",
    heading: String(formData.get("heading") ?? "").trim() || "Ahlan wa sahlan, {name}.",
    body_html: String(formData.get("body_html") ?? ""),
    product_slugs: slugs,
    updated_at: new Date().toISOString(),
  };
  await supabase.from("hello_mail_settings").upsert({ id: 1, ...row });
  await logAdmin(supabase, s, {
    category: "emails",
    action: "update",
    entity: "hello_mail",
    entityId: "1",
    label: "hello mail",
    summary: `Updated hello welcome mail (${slugs.length} products)`,
    details: { ...row },
  });
  revalidatePath("/admin/emails/hello");
}

export default async function HelloMailPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/orders");
  const supabase = await createClient();
  const { data } = await supabase
    .from("hello_mail_settings")
    .select("subject, heading, body_html, product_slugs")
    .eq("id", 1)
    .single();
  const row = (data as {
    subject?: string;
    heading?: string;
    body_html?: string;
    product_slugs?: string[];
  } | null) ?? {};
  const slugs: string[] = Array.isArray(row.product_slugs) ? row.product_slugs : [];
  const products = await getHelloProducts(slugs).catch(() => []);

  return (
    <>
      <AdminNav email={session.email} role={session.role} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="eyebrow">Emails / Hello</p>
        <h1 className="font-display text-3xl">Hello welcome mail</h1>
        <p className="mt-1 text-sm text-ink/60">
          Sent from <span className="font-mono" dir="ltr">{mailboxAddress("hello")}</span> when an
          account is created. Use {"{name}"} in the heading for the shopper&apos;s name.
        </p>

        <AdminForm
          action={saveHello}
          success="Hello mail saved"
          className="mt-8 grid gap-4 border border-ink/10 bg-white p-6 text-sm"
        >
          <label className="block">
            Subject
            <input
              name="subject"
              defaultValue={row.subject ?? "Welcome to the Maison — Misk Al Ghazaal"}
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Heading ({"{name}"} = shopper name)
            <input
              name="heading"
              defaultValue={row.heading ?? "Ahlan wa sahlan, {name}."}
              className="mt-1 w-full border border-ink/20 px-3 py-2"
            />
          </label>
          <label className="block">
            Body (simple HTML allowed: p / strong / em / a / br)
            <textarea
              name="body_html"
              rows={8}
              defaultValue={
                row.body_html ??
                "<p>Your maison account is ready.</p>"
              }
              dir="ltr"
              className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono text-[13px]"
            />
          </label>
          <div>
            <label className="block">
              Best-seller slugs (up to 3, comma separated)
              <input
                name="product_slugs"
                defaultValue={slugs.join(", ")}
                placeholder="e.g. misk-al-ghazaal-12ml, big-boss-dukhoon"
                dir="ltr"
                className="mt-1 w-full border border-ink/20 px-3 py-2 font-mono text-[13px]"
              />
            </label>
            <p className="mt-2 text-xs text-ink/50">
              Find slugs in <Link href="/admin/products" className="underline">Products → search</Link> (e.g.
              misk-al-ghazaal-12ml). Empty = live best sellers fill in automatically.
            </p>
          </div>
          <SaveButton>Save hello mail</SaveButton>
        </AdminForm>

        <h2 className="mt-10 font-display text-xl">Preview (as the shopper sees it)</h2>
        <div className="mt-4 border border-ink/10 bg-[#faf7f1] p-6" style={{ fontFamily: "Georgia, serif" }}>
          <p className="text-[11px] uppercase tracking-[3px] text-[#8a6d2f]">Misk Al Ghazaal</p>
          <h3 className="mt-2 text-[28px] font-normal">
            {(row.heading ?? "Ahlan wa sahlan, {name}.").replace("{name}", "Friend")}
          </h3>
          <div
            className="mt-4 border-t border-[#e9e1d2] pt-5 text-[15px] leading-[1.7]"
            dangerouslySetInnerHTML={{ __html: row.body_html ?? "" }}
          />
          {products.length > 0 && (
            <>
              <h4 className="mt-6 text-[13px] uppercase tracking-[2px] text-[#8a6d2f]">
                Begin with the icons
              </h4>
              <ul className="mt-3 grid gap-4 sm:grid-cols-3">
                {products.map((p) => (
                  <li key={p.href} className="border border-ink/10 bg-white p-3">
                    <p className="text-[15px]">{p.title}</p>
                    <p className="mt-1 text-[13px] text-[#8a6d2f]">AED {p.price.toFixed(2)}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink/50" dir="ltr">{p.href}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
