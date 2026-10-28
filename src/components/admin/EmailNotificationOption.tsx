"use client";
import type { ReactNode } from "react";
import { DISABLED_EMAIL_HINT } from "@/lib/notification-rules";
export function EmailNotificationOption({
  enabled,
  name = "notify_email",
  defaultChecked = true,
  checked,
  onChange,
  children,
}: {
  enabled: boolean;
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div
      className="group relative"
      tabIndex={enabled ? undefined : 0}
      title={enabled ? undefined : DISABLED_EMAIL_HINT}
    >
      <label
        className={`flex items-start gap-2 text-xs leading-6 ${enabled ? "" : "cursor-not-allowed opacity-50"}`}
      >
        <input
          type="checkbox"
          name={name}
          disabled={!enabled}
          {...(checked !== undefined
            ? {
                checked: enabled && checked,
                onChange: (e) => onChange?.(e.target.checked),
              }
            : { defaultChecked: enabled && defaultChecked })}
          className="mt-1"
        />
        {children ?? "Email the customer about this update"}
      </label>
      {!enabled && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full start-0 z-50 mb-2 hidden w-72 max-w-[80vw] border border-ink/10 bg-white p-3 text-xs leading-5 text-ink shadow-lg group-hover:block group-focus:block"
        >
          {DISABLED_EMAIL_HINT}
        </span>
      )}
    </div>
  );
}
