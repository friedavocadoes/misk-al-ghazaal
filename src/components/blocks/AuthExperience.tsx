"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthTabs } from "./AuthTabs";
import styles from "./auth-experience.module.css";

export function AuthExperience({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("Account");
  return (
    <div className={styles.experience}>
      <section className={styles.intro}>
        <Link href="/" aria-label="Misk Al Ghazaal" className={styles.crest}>
          <Image src="/mag.webp" width={88} height={88} alt="" />
        </Link>
        <p className="eyebrow text-gold">{t("clientSpace")}</p>
        <h1>{t(mode === "login" ? "welcomeBack" : "welcomeIn")}</h1>
        <p className={styles.description}>{t("accountInvitation")}</p>
        <div className={styles.benefits}>
          <p><span>01</span>{t("benefitOrders")}</p>
          <p><span>02</span>{t("benefitWishlist")}</p>
          <p><span>03</span>{t("benefitRewards")}</p>
        </div>
        <Link href="/collections" className="link-underline text-xs">{t("exploreCollection")}</Link>
        <span className={styles.watermark} aria-hidden="true">M</span>
      </section>
      <section className={styles.form} aria-label={t(mode)}>
        <Suspense fallback={<div className="min-h-96 animate-pulse bg-sand/40" />}>
          <AuthTabs defaultTab={mode} />
        </Suspense>
      </section>
    </div>
  );
}

