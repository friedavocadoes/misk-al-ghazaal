"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-3xl flex-col gap-3 border border-ink/15 bg-white p-4 shadow-[0_24px_60px_-24px_rgba(28,25,23,0.4)] sm:flex-row sm:items-center">
      <p className="flex-1 text-xs leading-relaxed text-espresso">
        We use cookies to refine your shopping experience and understand
        traffic. By continuing you accept our cookie policy.
      </p>
      <div className="flex shrink-0 gap-2">
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
