import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowUpRight, Truck } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { OrderStatusChip } from "@/lib/order-status";
import { OrderTimeline } from "@/components/blocks/OrderTimeline";
import { OrderIssueBox } from "@/components/blocks/OrderIssueBox";
import { CopyCode } from "@/components/ui/copy-code";
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
        <Link href="/account/login?next=/account/orders" className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("login")}
        </Link>
      </div>
    );
  }

  const { supabase, user } = session;
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_no, total, subtotal, discount, shipping, status, created_at, tracking_no, tracking_url, order_items(title, qty, unit_price)")
    .or(`user_id.eq.${user.id}${user.email ? `,email.ilike.${user.email}` : ""}`)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (orders as {
    id: string; order_no: string; total: number; subtotal: number; discount: number;
    shipping: number; status: string; created_at: string;
    tracking_no: string | null; tracking_url: string | null;
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
            <li key={o.id} className="border border-ink/10 bg-white p-5 transition hover:border-gold/50 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-ink">
                  {t("orderNo")} {o.order_no}
                </p>
                <OrderStatusChip status={o.status} />
              </div>
              <p className="mt-1 text-[13px] text-fog">
                {new Date(o.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              </p>

              <OrderTimeline status={o.status} locale={locale} />

              {(o.tracking_no || o.tracking_url) && (
                <div className="mt-1 flex flex-wrap items-center gap-3 border border-gold/40 bg-gold-wash/50 p-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-ink text-gold-soft">
                    <Truck className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
                      {t("trackingTitle")}
                    </span>
                    {o.tracking_no && (
                      <span className="mt-0.5 block font-mono text-[15px] font-bold tracking-[0.1em] text-ink" dir="ltr">
                        {o.tracking_no}
                      </span>
                    )}
                  </span>
                  {o.tracking_no && <CopyCode code={o.tracking_no} label={t("copyCode")} copied={t("codeCopied")} />}
                  {o.tracking_url && (
                    <a
                      href={o.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-gold-soft hover:text-ink"
                    >
                      {t("trackParcel")} <ArrowUpRight className="size-3.5" />
                    </a>
                  )}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-4">
                <span className="font-display text-lg text-ink">{formatAED(Number(o.total))}</span>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="group inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink"
                >
                  <span className="border-b border-ink/30 pb-0.5 transition group-hover:border-gold group-hover:text-gold">
                    {t("viewDetails")}
                  </span>
                  <span aria-hidden className="text-gold transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1">→</span>
                </Link>
              </div>
              <OrderIssueBox orderId={o.id} orderNo={o.order_no} status={o.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
