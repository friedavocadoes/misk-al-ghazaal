"use client";
import { useState } from "react";
export function OrderCustomerLink({ path }: { path: string | null }) {
  const [copied, setCopied] = useState(false),
    [failed, setFailed] = useState(false);
  if (!path)
    return (
      <p className="text-xs text-fog">
        Apply migration_guest_order_links.sql to enable the customer’s private
        order link.
      </p>
    );
  return (
    <div>
      <p className="mb-3 text-xs leading-6 text-fog">
        This link opens without sign-in. Treat it as private customer
        information. Staff previews never claim the order.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className="admin-action"
        >
          Open customer order ↗
        </a>
        <button
          type="button"
          className="admin-action"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                new URL(path, location.origin).href,
              );
              setCopied(true);
              setFailed(false);
            } catch {
              setFailed(true);
            }
          }}
        >
          {copied ? "Copied" : "Copy private link"}
        </button>
      </div>
      {failed && (
        <p role="status" className="mt-3 text-xs text-fog">
          Copy the address after opening the customer order link.
        </p>
      )}
    </div>
  );
}
