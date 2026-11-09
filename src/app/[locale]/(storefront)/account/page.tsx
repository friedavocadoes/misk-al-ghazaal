import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Camera, ChevronDown, ChevronRight, Gift, Heart, KeyRound, LayoutDashboard, LifeBuoy, Mail, MapPin, Package, Star, Ticket, UserRound } from "lucide-react";
import { AuthTabs } from "@/components/blocks/AuthTabs";
import { CopyCode } from "@/components/ui/copy-code";
import { AvatarUploader } from "@/components/blocks/AvatarUploader";
import { ShopperAvatar } from "@/components/ui/avatar";
import { ShopperSignOut } from "@/components/blocks/ShopperSignOut";
import { avatarOf, displayName, providerOf } from "@/lib/shopper-identity";
import { requireShopper } from "@/lib/shopper";
import { toLocale } from "@/lib/i18n";

export default async function AccountPage(
  props: PageProps<"/[locale]/account">,
) {
  const { locale: raw } = await props.params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Account" });

  const session = await requireShopper();

  // Guest: straight to the form — login + register live as tabs.
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <p className="eyebrow text-center text-gold">{t("eyebrow")}</p>
        <h1 className="mt-3 text-center font-display text-4xl text-ink">
          {t("title")}
        </h1>
        <p className="mt-3 text-center text-sm text-espresso">
          {t("referralHint")}
        </p>
        <div className="mt-8">
          <Suspense>
            <AuthTabs defaultTab="login" />
          </Suspense>
        </div>
      </div>
    );
  }

  const { supabase, user } = session;
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "referral_code, referral_uses, avatar_url, role, full_name, phone, promo_opt_in, order_updates_opt_in",
    )
    .eq("id", user.id)
    .single();

  const code =
    (profile as { referral_code?: string } | null)?.referral_code ?? "";
  const uses =
    (profile as { referral_uses?: number } | null)?.referral_uses ?? 0;
  const storedName =
    (profile as { full_name?: string | null } | null)?.full_name ?? "";
  const storedPhone =
    (profile as { phone?: string | null } | null)?.phone ?? "";
  const promoOn =
    (profile as { promo_opt_in?: boolean | null } | null)?.promo_opt_in !==
    false;
  const orderMailOn =
    (profile as { order_updates_opt_in?: boolean | null } | null)
      ?.order_updates_opt_in !== false;
  const name = storedName || displayName(user);
  const avatar = avatarOf(
    user,
    profile as { avatar_url?: string | null } | null,
  );
  const provider = providerOf(user);
  const staff = ["super_admin", "orders"].includes(
    (profile as { role?: string } | null)?.role ?? "",
  );

  const ar = locale === "ar";
  const actions = [
    { href: "/account/orders", icon: Package, label: t("ordersTitle"), description: ar ? "تتبع شحناتك واعرض الطلبات السابقة" : "Track shipments and view past purchases" },
    { href: "/account/addresses", icon: MapPin, label: ar ? "العناوين المحفوظة" : "Saved addresses", description: ar ? "إدارة عناوين التوصيل" : "Manage your delivery addresses" },
    { href: "/account/wishlist", icon: Heart, label: t("wishlistTitle"), description: ar ? "العطور التي حفظتها" : "Revisit the fragrances you saved" },
    { href: "/account/coupons", icon: Ticket, label: t("rewardsTitle"), description: ar ? "قسائمك ومكافآتك" : "See your coupons and rewards" },
    { href: "/account/ratings", icon: Star, label: ar ? "تقييماتي ومراجعاتي" : "My ratings & reviews", description: ar ? "عرض تقييماتك ومراجعاتك" : "View the feedback you’ve shared" },
    { href: "/account/settings", icon: UserRound, label: ar ? "البيانات الشخصية" : "Personal details", description: ar ? "حدّث اسمك ورقم هاتفك" : "Update your name and phone number" },
    { href: "/account/notifications", icon: Mail, label: ar ? "تفضيلات البريد" : "Email preferences", description: ar
      ? `الطلبات ${orderMailOn ? "مفعّلة" : "متوقفة"} · العروض ${promoOn ? "مفعّلة" : "متوقفة"}`
      : `Orders ${orderMailOn ? "on" : "off"} · Offers ${promoOn ? "on" : "off"}` },
    ...(provider === "email" ? [{ href: "/account/password", icon: KeyRound, label: t("changePassword"), description: ar ? "إدارة كلمة مرور حسابك" : "Manage your account password" }] : []),
  ];
  const row = "group flex min-h-20 min-w-0 items-center gap-3.5 bg-white p-4 text-start transition-colors hover:bg-gold-wash/35 focus-visible:z-10 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-gold sm:p-5";
  const icon = "grid size-10 shrink-0 place-items-center rounded-full border border-gold/25 bg-gold-wash/40 text-gold";
  const arrow = <ChevronRight aria-hidden className="ms-auto size-4 shrink-0 text-gold rtl:rotate-180" />;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-16">
      <header className="relative isolate overflow-hidden border border-gold/25 bg-gradient-to-br from-white via-white to-gold-wash/60 px-5 py-8 sm:px-9">
        <span aria-hidden className="pointer-events-none absolute -bottom-16 end-2 -z-10 select-none font-display text-[13rem] leading-none text-gold/[0.08]">
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-start">
          <ShopperAvatar url={avatar} name={name} className="size-24 shrink-0 text-4xl ring-1 ring-gold/60 ring-offset-4 ring-offset-white md:size-28" />
          <div className="min-w-0">
            <p className="eyebrow text-gold">{t("title")}</p>
            <h1 className="mt-2 break-words font-display text-3xl text-ink md:text-5xl">{name || t("welcome")}</h1>
            {user.email && <p className="mt-2 break-all text-sm text-espresso"><bdi>{user.email}</bdi></p>}
            {storedPhone && <p className="mt-1 text-sm text-fog"><bdi>{storedPhone}</bdi></p>}
          </div>
        </div>
      </header>

      <nav aria-label={ar ? "خيارات الحساب" : "Account options"} className="mt-5 overflow-hidden border border-ink/10 bg-ink/10">
        <div className="grid gap-px sm:grid-cols-2">
          {actions.map(({ href, icon: Icon, label, description }) => (
            <Link key={href} href={href} className={row}>
              <span className={icon}><Icon aria-hidden className="size-[18px]" strokeWidth={1.5} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-fog">{description}</span>
              </span>
              {arrow}
            </Link>
          ))}
          <AvatarUploader userId={user.id} name={name} initial={avatar} className={`${row} cursor-pointer`}>
            <span className={icon}><Camera aria-hidden className="size-[18px]" strokeWidth={1.5} /></span>
            <span className="text-sm font-semibold text-ink">{t("avatarUpload")}</span>
            {arrow}
          </AvatarUploader>
          <a href="mailto:support@miskalghazaalperfumes.com" className={`${row}${!staff && actions.length % 2 ? " sm:col-span-2" : ""}`}>
            <span className={icon}><LifeBuoy aria-hidden className="size-[18px]" strokeWidth={1.5} /></span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{ar ? "الشكاوى والدعم" : "Complaints & support"}</span>
              <span className="mt-1 block text-xs text-fog">{ar ? "راسل فريقنا" : "Email our team"}</span>
            </span>
            {arrow}
          </a>
          {staff && (
            <NextLink href="/admin" className={`${row}${actions.length % 2 === 0 ? " sm:col-span-2" : ""}`}>
              <span className={icon}><LayoutDashboard aria-hidden className="size-[18px]" strokeWidth={1.5} /></span>
              <span className="text-sm font-semibold text-ink">{ar ? "لوحة الإدارة" : "Open admin panel"}</span>
              {arrow}
            </NextLink>
          )}
          <details className="group/referral bg-white sm:col-span-2">
            <summary className={`${row} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              <span className={icon}><Gift aria-hidden className="size-[18px]" strokeWidth={1.5} /></span>
              <span className="text-sm font-semibold text-ink">{t("referralTitle")}</span>
              <ChevronDown aria-hidden className="ms-auto size-4 text-gold transition-transform group-open/referral:rotate-180" />
            </summary>
            <div className="border-t border-ink/10 px-5 py-4">
              <p className="text-sm leading-relaxed text-espresso">{t("referralText")}</p>
              {code && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span dir="ltr" className="border border-gold/40 bg-gold-wash/40 px-3 py-2 font-mono text-sm tracking-widest text-ink">{code}</span>
                  <CopyCode code={code} label={t("copyCode")} copied={t("codeCopied")} />
                  <span className="text-xs text-fog">{uses} {ar ? "استخدام" : uses === 1 ? "use" : "uses"}</span>
                </div>
              )}
            </div>
          </details>
          <ShopperSignOut className="sm:col-span-2" />
        </div>
      </nav>
    </main>
  );
}
