"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SearchSuggest } from "@/components/search/SearchSuggest";

/** Console quick-find: type-ahead across live catalog rows (paused
    included via scope=admin) — picking a card jumps straight to its
    editor, Enter falls back to the list `?q=` filter. */
export function AdminProductSearch() {
  const router = useRouter();
  return (
    <div className="relative min-w-52 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog" />
      <SearchSuggest
        scope="admin"
        recentKey="misk-admin-recents"
        placeholder="Type to find any product…"
        inputClassName="w-full border border-ink/20 bg-white py-2 pl-9 pr-3 text-sm text-ink placeholder:text-fog/70 focus:border-gold focus:outline-none"
        pickHref={(it) => `/admin/products/${it.id}`}
        submitLabel={(term) => `Filter list: “${term}”`}
        onSubmitTerm={(term) => router.push(`/admin/products?q=${encodeURIComponent(term)}`)}
      />
    </div>
  );
}
