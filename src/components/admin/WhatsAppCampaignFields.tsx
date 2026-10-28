"use client";
import { useState } from "react";
export function WhatsAppCampaignFields() {
  const [count, setCount] = useState(0);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Approved template name
          <input
            name="template"
            required
            placeholder="maison_new_arrivals"
            pattern="[a-z0-9_]+"
            className="min-w-0 border border-ink/20 p-3"
          />
        </label>
        <label className="grid gap-2 text-sm">
          Exact template language
          <input
            name="language"
            required
            defaultValue="en"
            className="min-w-0 border border-ink/20 p-3"
          />
        </label>
      </div>
      <div className="grid gap-3 border-t border-ink/10 pt-4">
        <p className="text-sm">Template variables</p>
        <p className="text-xs leading-6 text-fog">
          If your approved message has placeholders such as
          &#123;&#123;1&#125;&#125;, add their values below in the same order.
          Leave empty for a message with no variables. These values are shared
          by every recipient.
        </p>
        {Array.from({ length: count }, (_, i) => (
          <label key={i} className="grid gap-2 text-sm">
            Variable {i + 1}
            <textarea
              name="parameter"
              required
              rows={2}
              maxLength={500}
              className="min-w-0 border border-ink/20 p-3"
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-4 text-xs">
          <button
            type="button"
            disabled={count >= 10}
            onClick={() => setCount((v) => v + 1)}
            className="underline disabled:opacity-40"
          >
            + Add variable
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={() => setCount((v) => v - 1)}
              className="text-red-800 underline"
            >
              Remove last variable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
