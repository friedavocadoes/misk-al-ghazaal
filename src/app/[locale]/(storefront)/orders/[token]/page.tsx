import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/service";
import { validOrderToken } from "@/lib/order-access-shared";
import { OrderStatusChip } from "@/lib/order-status";
import { OrderTimeline } from "@/components/blocks/OrderTimeline";
import { TrackOrderButton } from "@/components/blocks/TrackOrderButton";
import { GuestOrderAccess } from "@/components/blocks/GuestOrderAccess";
import { canTrackOrder } from "@/lib/order-tracking";
import { formatAED } from "@/lib/utils";
import {
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/admin-orders-model";
import { STORE_CONTACT, waLink } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your order · Misk Al Ghazaal",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export default async function GuestOrderPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: raw, token } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const ar = locale === "ar";
  if (!validOrderToken(token)) notFound();
  const db = createAdminClient();
  const { data: link, error: linkError } = await db
    .from("order_access_links")
    .select("order_id")
    .eq("token", token)
    .maybeSingle();
  if (linkError)
    throw new Error("Order updates are temporarily unavailable. Please retry.");
  if (!link) notFound();
  // Explicit allowlist: no internal notes, account email, analytics or staff data.
  const { data: order, error } = await db
    .from("orders")
    .select(
      "id,order_no,customer_name,status,payment_status,payment_method,created_at,subtotal,discount,shipping,total,address,city,state_name,emirate,country_code,postcode,tracking_no,tracking_url,expected_delivery_date,deleted_at",
    )
    .eq("id", link.order_id)
    .single();
  if (error)
    throw new Error("Order updates are temporarily unavailable. Please retry.");
  if (!order || order.deleted_at)
    return (
      <main className="order-passport">
        <h1>
          {ar
            ? "هذا الطلب لم يعد متاحاً"
            : "This order is no longer available."}
        </h1>
        <p className="mt-5 text-sm">
          {ar
            ? "يرجى التواصل مع فريقنا للمساعدة."
            : "Please contact our team if you need help with this order."}
        </p>
        <a
          href={waLink(STORE_CONTACT.shopMobile)}
          target="_blank"
          rel="noreferrer"
          className="order-primary-link mt-6"
        >
          {ar ? "تواصل معنا" : "Contact us"} ↗
        </a>
      </main>
    );
  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("id,title,qty,unit_price,product_slug")
    .eq("order_id", order.id);
  if (itemsError) throw new Error("Order items could not load. Please retry.");
  const slugs = [...new Set((items ?? []).map((i) => i.product_slug))];
  const { data: products } = slugs.length
    ? await db.from("products").select("slug,images").in("slug", slugs)
    : { data: [] };
  const images = new Map(
    (products ?? []).map((p) => [p.slug, p.images?.[0] as string | undefined]),
  );
  const terminal = order.status === "cancelled" || order.status === "returned";
  return (
    <main className="order-passport">
      <header className="order-passport-heading">
        <p className="eyebrow">
          {ar ? "مسك الغزال · طلبك" : "Misk Al Ghazaal · Your order"}
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1>{order.order_no}</h1>
            <p className="mt-3 text-xs text-fog">
              {new Intl.DateTimeFormat(ar ? "ar-AE" : "en-GB", {
                dateStyle: "long",
                timeZone: "Asia/Dubai",
              }).format(new Date(order.created_at))}
            </p>
          </div>
          <OrderStatusChip status={order.status} />
        </div>
      </header>
      <section className="order-journey">
        <h2>
          {order.status === "cancelled"
            ? ar
              ? "تم إلغاء طلبك"
              : "Your order has been cancelled."
            : order.status === "returned"
              ? ar
                ? "تم إرجاع طلبك"
                : "Your order has been returned."
              : order.status === "delivered"
                ? ar
                  ? "وصل إليك"
                  : "A little luxury, delivered."
                : ar
                  ? "نتابع طلبك بعناية"
                  : "Your order, in good hands."}
        </h2>
        <p>
          {order.status === "new"
            ? ar
              ? "استلمنا طلبك. سنرسل التحديث التالي بعد تأكيد فريقنا له."
              : "We have your order. Your next update will follow once our team has confirmed it."
            : terminal
              ? ar
                ? "تواصل معنا إذا احتجت إلى المساعدة بشأن هذا التحديث."
                : "If you have a question about this update, our team is here to help."
              : ar
                ? "ستجد آخر تحديثات الطلب هنا وفي رسائل البريد الإلكتروني."
                : "You’ll find the latest updates here and in your order emails."}
        </p>
        <OrderTimeline status={order.status} locale={locale} />
        {!terminal && order.expected_delivery_date && (
          <p className="mt-6 text-sm">
            {ar ? "التسليم المتوقع" : "Expected delivery"} ·{" "}
            {order.expected_delivery_date}
          </p>
        )}
        {canTrackOrder(order.status, order.tracking_no) && (
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-ink/10 pt-5">
            <span className="font-mono text-xs">{order.tracking_no}</span>
            <TrackOrderButton
              number={order.tracking_no}
              url={order.tracking_url}
              locale={locale}
            />
          </div>
        )}
      </section>
      <div className="order-passport-grid">
        <section className="order-selection">
          <h2>{ar ? "اختياراتك" : "Your selection"}</h2>
          {(items ?? []).map((item) => (
            <div key={item.id} className="order-selection-line">
              <div className="relative size-20 shrink-0 bg-white">
                {images.get(item.product_slug) ? (
                  <Image
                    src={images.get(item.product_slug)!}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-fog">
                    MAG
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p>{item.title}</p>
                <p className="mt-2 text-xs text-fog">
                  {item.qty} × {formatAED(Number(item.unit_price))}
                </p>
              </div>
              <span className="shrink-0 text-xs">
                {formatAED(item.qty * Number(item.unit_price))}
              </span>
            </div>
          ))}
          <dl className="order-totals">
            <div>
              <dt>{ar ? "المجموع الفرعي" : "Subtotal"}</dt>
              <dd>{formatAED(Number(order.subtotal))}</dd>
            </div>
            {Number(order.discount) > 0 && (
              <div>
                <dt>{ar ? "الخصم" : "Discount"}</dt>
                <dd>− {formatAED(Number(order.discount))}</dd>
              </div>
            )}
            <div>
              <dt>{ar ? "التوصيل" : "Delivery"}</dt>
              <dd>{formatAED(Number(order.shipping))}</dd>
            </div>
            <div>
              <dt>{ar ? "الإجمالي" : "Total"}</dt>
              <dd>{formatAED(Number(order.total))}</dd>
            </div>
          </dl>
          <p className="mt-5 text-[11px] text-fog">
            {paymentMethodLabel(order.payment_method)} ·{" "}
            {paymentStatusLabel(order.payment_status ?? "pending")}
          </p>
        </section>
        <aside className="space-y-5">
          <GuestOrderAccess token={token} locale={locale} orderId={order.id} />
          <section className="order-address">
            <h2>{ar ? "تفاصيل التوصيل" : "Delivery details"}</h2>
            <address className="mt-4 text-sm not-italic leading-7">
              {order.customer_name}
              <br />
              {[
                ...new Set(
                  [
                    order.address,
                    order.city,
                    order.state_name || order.emirate,
                    order.postcode,
                    order.country_code,
                  ].filter(Boolean),
                ),
              ].join(", ")}
            </address>
            <Link
              href="/pages/contact"
              className="mt-6 inline-block text-xs underline underline-offset-4"
            >
              {ar ? "تحتاج مساعدة؟" : "Need a hand with your order?"} ↗
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
