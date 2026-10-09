"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { AuthTabs } from "@/components/blocks/AuthTabs";

export default function LoginPage() {
  const t = useTranslations("Account");
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="eyebrow text-center text-gold">{t("eyebrow")}</p>
      <h1 className="mt-3 text-center font-display text-4xl text-ink">{t("login")}</h1>
      <div className="mt-8">
        <Suspense>
          <AuthTabs defaultTab="login" />
        </Suspense>
      </div>
    </div>
  );
}
