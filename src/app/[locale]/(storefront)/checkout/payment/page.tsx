import { setRequestLocale } from "next-intl/server";
import { toLocale } from "@/lib/i18n";
import { CheckoutPaymentStatus } from "@/components/blocks/CheckoutPaymentStatus";

export default async function CheckoutPaymentPage({ params, searchParams }: PageProps<"/[locale]/checkout/payment">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { attempt, tap_id } = await searchParams;
  return <CheckoutPaymentStatus locale={locale} id={typeof attempt === "string" ? attempt : ""} chargeId={typeof tap_id === "string" ? tap_id : undefined} />;
}
