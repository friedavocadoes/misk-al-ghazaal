import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";

export default async function AccountOrdersPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });

  const session = await requireShopper();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="mt-3 text-sm text-espresso">{t("referralHint")}</p>
        <Link href="/account/login" className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("login")}
        </Link>
      </div>
    );
  }

  const { supabase, user } = session;
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_no, total, subtotal, discount, shipping, status, created_at, order_items(title, qty, unit_price)")
    .or(`user_id.eq.${user.id}${user.email ? `,email.ilike.${user.email}` : ""}`)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (orders as {
    id: string; order_no: string; total: number; subtotal: number; discount: number;
    shipping: number; status: string; created_at: string;
    order_items: { title: string; qty: number; unit_price: number }[];
  }[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <Link href="/account" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-fog transition hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("backToAccount")}
      </Link>
      <h1 className="mt-3 font-display text-4xl text-ink">{t("ordersTitle")}</h1>

      {!rows.length ? (
        <p className="mt-6 border border-dashed border-ink/20 p-8 text-center text-sm text-fog">
          {t("ordersEmpty")}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((o) => (
            <li key={o.id} className="border border-ink/10 bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-ink">
                  {t("orderNo")} {o.order_no}
                </p>
                <span className="border border-ink/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-espresso">
                  {o.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-fog">
                {new Date(o.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10 text-sm">
                {o.order_items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-2">
                    <span className="text-espresso">
                      {it.title} <span className="text-fog">× {it.qty}</span>
                    </span>
                    <span className="text-ink">{formatAED(Number(it.unit_price) * it.qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-fog">
                  <dt>Subtotal</dt>
                  <dd>{formatAED(Number(o.subtotal))}</dd>
                </div>
                {Number(o.discount) > 0 && (
                  <div className="flex justify-between text-[#1e7a46]">
                    <dt>Discount</dt>
                    <dd>−{formatAED(Number(o.discount))}</dd>
                  </div>
                )}
                <div className="flex justify-between text-fog">
                  <dt>Shipping</dt>
                  <dd>{Number(o.shipping) === 0 ? "Complimentary" : formatAED(Number(o.shipping))}</dd>
                </div>
                <div className="flex justify-between border-t border-ink/10 pt-2 font-display text-lg text-ink">
                  <dt>Total</dt>
                  <dd>{formatAED(Number(o.total))}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
