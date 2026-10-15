"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export function ShopperSignOut() {
  const t = useTranslations("Account");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        // Device hygiene: the local bag + any applied-code handoff belong
        // to this account — the next login on this browser must start
        // clean instead of inheriting them.
        try {
          localStorage.removeItem("misk-cart-v1");
          localStorage.removeItem("misk-coupon");
        } catch {
          /* private mode */
        }
        await createBrowserClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {t("signOut")}
    </Button>
  );
}
