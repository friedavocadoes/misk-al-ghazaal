import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Gift, MapPin, Phone, Truck } from "lucide-react";
import { formatAED } from "@/lib/utils";
import { OrderStatusChip } from "@/lib/order-status";
import { OrderTimeline } from "@/components/blocks/OrderTimeline";
import { CopyCode } from "@/components/ui/copy-code";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { STORE_CONTACT, waLink } from "@/lib/site";
import { getProductBySlug } from "@/lib/store";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";

export default async function AccountOrderDetail(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });

  const session = await requireShopper();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <Link href="/account/login" className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("login")}
        </Link>
      </div>
    );
  }

  const { supabase, user } = session;
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .or(`user_id.eq.${user.id}${user.email ? `,email.ilike.${user.email}` : ""}`)
    .single();

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="font-display text-2xl text-ink">{t("ordersEmpty")}</p>
        <Link href="/account/orders" className="link-underline mt-4 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
          {t("ordersTitle")}
        </Link>
      </div>
    );
  }

  const o = order as {
    order_no: string; total: number; subtotal: number; discount: number;
    shipping: number; status: string; created_at: string;
    customer_name: string; phone: string; address: string; city: string;
    emirate: string; country_code: string | null; state_name: string | null;
    postcode: string | null; address_label: string | null;
    delivery_lat: number | null; delivery_lng: number | null;
    tracking_no: string | null; tracking_url: string | null;
  };
  const { data: items } = await supabase
    .from("order_items")
    .select("title, qty, unit_price, product_slug")
    .eq("order_id", id);
  const lines = (items as { title: string; qty: number; unit_price: number; product_slug: string }[] | null) ?? [];

  // Product faces for reorder: resolved live, gift lines stay text-only.
  const faces = await Promise.all(
    lines.map(async (l) => {
      if (!l.product_slug || l.product_slug === "gift") return null;
      const p = await getProductBySlug(l.product_slug).catch(() => null);
      return p ? { image: p.images[0] ?? "", slug: p.slug } : null;
    }),
  );

  const arLabel = (en: string, arh: string) => (locale === "ar" ? arh : en);
  const statusAr =
    o.status === "new" ? "بانتظار التأكيد" : o.status === "cancelled" ? "ملغي" : o.status === "returned" ? "مُرجع" : undefined;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-fog transition hover:text-ink">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("ordersTitle")}
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-gold">{t("orderNo")} {o.order_no}</p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            {new Date(o.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </h1>
        </div>
        <OrderStatusChip status={o.status} {...(statusAr ? { label: statusAr } : {})} />
      </div>

      <div className="mt-2 border border-ink/10 bg-white p-5 md:p-6">
        <OrderTimeline status={o.status} locale={locale} />
      </div>

      {(o.tracking_no || o.tracking_url) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border border-gold/40 bg-gold-wash/50 p-4 md:p-5">
          <span className="flex size-10 items-center justify-center rounded-full bg-ink text-gold-soft">
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

      {/* Items */}
      <section className="mt-6">
        <h2 className="font-display text-2xl text-ink">{t("itemsTitle")}</h2>
        <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 bg-white">
          {lines.map((l, i) => {
            const face = faces[i];
            const inner = (
              <>
                <span className="relative block h-20 w-16 shrink-0 overflow-hidden bg-sand">
                  {face?.image ? (
                    <Image src={face.image} alt={l.title} fill sizes="64px" className="object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-gold">
                      <Gift className="size-5" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{l.title}</span>
                  <span className="mt-0.5 block text-[13px] text-fog">× {l.qty}</span>
                </span>
                <span className="shrink-0 text-sm text-ink">{formatAED(Number(l.unit_price) * l.qty)}</span>
              </>
            );
            return (
              <li key={i} className="p-4">
                {face ? (
                  <Link href={`/product/${face.slug}`} className="group flex items-center gap-4">
                    {inner}
                  </Link>
                ) : (
                  <span className="flex items-center gap-4">{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1 border border-ink/10 bg-white p-5 text-sm">
          <div className="flex justify-between text-fog">
            <dt>{arLabel("Subtotal", "الفرعي")}</dt>
            <dd>{formatAED(Number(o.subtotal))}</dd>
          </div>
          {Number(o.discount) > 0 && (
            <div className="flex justify-between text-[#1e7a46]">
              <dt>{arLabel("Discount", "الخصم")}</dt>
              <dd>−{formatAED(Number(o.discount))}</dd>
            </div>
          )}
          <div className="flex justify-between text-fog">
            <dt>{arLabel("Shipping", "الشحن")}</dt>
            <dd>{Number(o.shipping) === 0 ? arLabel("Complimentary", "مجاني") : formatAED(Number(o.shipping))}</dd>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-2 font-display text-lg text-ink">
            <dt>{arLabel("Total", "الإجمالي")}</dt>
            <dd>{formatAED(Number(o.total))}</dd>
          </div>
        </dl>
      </section>

      {/* Delivery */}
      <section className="mt-6 border border-ink/10 bg-white p-5 md:p-6">
        <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
          <MapPin className="size-5 text-gold" /> {t("deliveryTitle")}
        </h2>
        <div className="mt-3 space-y-1 text-sm leading-relaxed text-espresso">
          {o.address_label && (
            <p className="inline-block border border-ink/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-fog">
              {o.address_label}
            </p>
          )}
          <p>{o.customer_name} · <span dir="ltr">{o.phone}</span></p>
          <p>{o.address}</p>
          <p>
            {[o.city, o.state_name, o.postcode, o.country_code].filter(Boolean).join(" · ")}
          </p>
          {o.delivery_lat != null && o.delivery_lng != null && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${o.delivery_lat},${o.delivery_lng}`}
              target="_blank"
              rel="noreferrer"
              className="link-underline inline-block text-[13px] font-medium text-gold"
              dir="ltr"
            >
              {o.delivery_lat}, {o.delivery_lng}
            </a>
          )}
        </div>
      </section>

      {/* Contact the factory */}
      <section className="mt-6 border border-gold/40 bg-gold-wash/50 p-5 md:p-6">
        <h2 className="font-display text-2xl text-ink">{t("contactTitle")}</h2>
        <p className="mt-1 text-sm text-espresso">{t("contactText", { orderNo: o.order_no })}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={waLink(STORE_CONTACT.factoryPhone)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 border border-[#1e7a46]/40 bg-white p-4 transition hover:border-[#1e7a46]"
          >
            <WhatsAppIcon className="size-5 shrink-0 text-[#1e7a46]" />
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1e7a46]">
                {t("whatsappFactory")}
              </span>
              <span className="block text-sm text-ink" dir="ltr">{STORE_CONTACT.factoryPhone}</span>
            </span>
          </a>
          <a
            href={`tel:${STORE_CONTACT.factoryPhone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 border border-ink/20 bg-white p-4 transition hover:border-ink"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white">
              <Phone className="size-4" />
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
                {t("callFactory")}
              </span>
              <span className="block text-sm text-ink" dir="ltr">{STORE_CONTACT.factoryPhone}</span>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
