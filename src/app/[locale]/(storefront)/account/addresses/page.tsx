import { setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";
import { AddressBook } from "./address-book";

export default async function AccountAddressesPage({ params }: PageProps<"/[locale]/account/addresses">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  if (!await requireShopper()) redirect({ href: "/account/login?next=/account/addresses", locale });
  const ar = locale === "ar";

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <Link href="/account" className="text-sm text-gold underline underline-offset-4">{ar ? "حسابي" : "My account"}</Link>
      <h1 className="mt-4 font-display text-4xl text-ink">{ar ? "العناوين المحفوظة" : "Saved addresses"}</h1>
      <AddressBook locale={locale} />
    </main>
  );
}
