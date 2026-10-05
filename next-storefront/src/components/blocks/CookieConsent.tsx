"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl sm:flex-row sm:items-center">
      <p className="flex-1 text-xs text-stone-600">
        We use cookies to improve your shopping experience and analyse
        traffic. By continuing you accept our cookie policy.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setDismissed(true)}>
          Decline
        </Button>
        <Button size="sm" onClick={() => setDismissed(true)}>
          Accept
        </Button>
      </div>
    </div>
  );
}
