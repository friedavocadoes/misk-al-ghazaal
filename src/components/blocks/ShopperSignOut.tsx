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
        await createBrowserClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {t("signOut")}
    </Button>
  );
}
