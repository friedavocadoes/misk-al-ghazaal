"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Clock, Loader2, SearchX, Star } from "lucide-react";
import type { SuggestItem } from "@/app/api/search/suggest/route";
import { tx } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { getRecents, pushRecent, useSuggest } from "./use-suggest";

export interface SearchSuggestHandle {
  /** Submit the current text (footer action) — used by external buttons. */
  submit: () => void;
}

/** Provider-free locale: derived from the URL itself, so this works in
    the locale-free admin console too (no NextIntlClientProvider there). */
function usePathLocale(): Locale {
  const pathname = usePathname();
  return pathname === "/ar" || pathname.startsWith("/ar/") ? "ar" : "en";
}

/** Prefix storefront hrefs on AR pages (plain next/link keeps whatever it
    is given — admin `/admin/…` hrefs pass through untouched). */
function useLocalizeHref() {
  const pathname = usePathname();
  const onAr = pathname === "/ar" || pathname.startsWith("/ar/");
  return (href: string) =>
    onAr &&
    href.startsWith("/") &&
    !href.startsWith("/ar") &&
    !href.startsWith("/admin")
      ? `/ar${href}`
      : href;
}

/** Descriptive suggestion card: face, lineup eyebrow, serif title, top
    notes + size, price + rating — the whole perfume at a glance. */
export function SuggestRow({
  item,
  active,
  locale,
}: {
  item: SuggestItem;
  active: boolean;
  locale: Locale;
}) {
  const title = tx(item.title, item.titleAr, locale);
  const lineup = tx(item.lineupTitle ?? "", item.lineupTitleAr, locale);
  const notes = item.topNotes
    .map((n) => tx(n.name, n.nameAr, locale))
    .filter(Boolean);
  const onSale =
    item.compareAtPrice != null && item.compareAtPrice > item.price;
  return (
    <span className="flex items-center gap-3 px-4 py-2.5 text-start">
      <span className="relative size-12 shrink-0 overflow-hidden bg-sand">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex size-full items-center justify-center font-display text-lg italic text-fog">
            {title.charAt(0)}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        {lineup && (
          <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.2em] text-gold">
            {lineup}
          </span>
        )}
        <span className="block truncate font-display text-[15px] text-ink">
          {title}
          {item.outOfStock && <span className="ms-2 text-[10px] text-red-700">{locale==="ar"?"نفد المخزون":"Out of stock"}</span>}
          {item.isActive === false && (
            <span className="ms-2 border border-gold/50 bg-gold-wash/60 px-1.5 py-px align-middle font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">
              Paused
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-fog">
          {[notes.join(" · "), item.firstVariant].filter(Boolean).join(" — ")}
          {item.variantCount > 1 ? ` · +${item.variantCount - 1}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-end">
        <span className="block text-[12px] font-semibold tracking-wide text-ink">
          AED {item.price.toFixed(0)}
        </span>
        {onSale && item.compareAtPrice ? (
          <s className="block text-[10px] text-ink/35">
            AED {item.compareAtPrice.toFixed(0)}
          </s>
        ) : item.reviewCount > 0 ? (
          <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-fog">
            <Star className="size-2.5 fill-gold text-gold" />
            {item.rating.toFixed(1)}
          </span>
        ) : null}
      </span>
      <ArrowUpRight
        className={cn(
          "size-4 shrink-0 transition-all",
          active
            ? "translate-x-0 text-gold opacity-100"
            : "-translate-x-1 opacity-0",
        )}
      />
    </span>
  );
}

/** Self-contained autocomplete: debounced live suggest, recent searches,
    full keyboard nav. Rows navigate via `pickHref` links; the footer +
    Enter submit through `onSubmitTerm`. `pickHref` decides where a row
    lands (PDP on the storefront, editor in the console). */
export const SearchSuggest = forwardRef<
  SearchSuggestHandle,
  {
    placeholder: string;
    autoFocus?: boolean;
    scope?: "store" | "admin";
    recentKey: string;
    pickHref: (item: SuggestItem) => string;
    submitLabel: (q: string) => string;
    onSubmitTerm: (q: string) => void;
    onNavigate?: () => void;
    inputClassName?: string;
  }
>(function SearchSuggest(
  {
    placeholder,
    autoFocus,
    scope = "store",
    recentKey,
    pickHref,
    submitLabel,
    onSubmitTerm,
    onNavigate,
    inputClassName,
  },
  ref,
) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recents, setRecents] = useState<string[]>([]);
  const { items, loading } = useSuggest(q, scope);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const locale = usePathLocale();
  const localizeHref = useLocalizeHref();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const safeActive = active >= 0 && active < items.length ? active : -1;

  const showRecents = open && q.trim().length < 2 && recents.length > 0;
  const showResults = open && q.trim().length >= 2;

  const submitTerm = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    pushRecent(recentKey, clean);
    setRecents(getRecents(recentKey));
    setOpen(false);
    onSubmitTerm(clean);
    onNavigate?.();
  };

  const pick = (item: SuggestItem) => {
    pushRecent(recentKey, item.title);
    setRecents(getRecents(recentKey));
    setOpen(false);
    onNavigate?.();
  };

  useImperativeHandle(ref, () => ({ submit: () => submitTerm(q) }));

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <input
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          safeActive >= 0 ? `${listId}-${safeActive}` : undefined
        }
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => {
          setRecents(getRecents(recentKey));
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && showResults) {
            e.preventDefault();
            setActive((a) =>
              Math.min(
                (a < 0 || a >= items.length ? -1 : a) + 1,
                items.length - 1,
              ),
            );
          } else if (e.key === "ArrowUp" && showResults) {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (showResults && safeActive >= 0 && items[safeActive]) {
              pick(items[safeActive]);
              document.getElementById(`${listId}-link-${safeActive}`)?.click();
            } else {
              submitTerm(q);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={inputClassName}
      />
      {(showRecents || showResults) && (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-[80] mt-2 animate-[account-in_0.22s_cubic-bezier(0.22,1,0.36,1)] overflow-hidden border border-ink/10 bg-white text-start shadow-[0_28px_56px_-24px_rgba(28,25,23,0.45)]"
        >
          {showRecents && (
            <ul className="max-h-64 overflow-y-auto py-2">
              {recents.map((r) => (
                <li key={r}>
                  <button
                    type="button"
                    onClick={() => submitTerm(r)}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2 text-sm text-espresso transition hover:bg-cream hover:text-ink"
                  >
                    <Clock className="size-3.5 shrink-0 text-fog" />
                    <span className="truncate">{r}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showResults && (
            <>
              {loading && items.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-3.5 text-sm text-fog">
                  <Loader2 className="size-4 animate-spin text-gold" />…
                </p>
              ) : items.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-3.5 text-sm text-fog">
                  <SearchX className="size-4" />
                  {submitLabel(q.trim())}
                </p>
              ) : (
                <ul className="max-h-[340px] overflow-y-auto py-1.5">
                  {items.map((it, i) => (
                    <li
                      key={it.id}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === safeActive}
                    >
                      <NextLink
                        id={`${listId}-link-${i}`}
                        href={localizeHref(pickHref(it))}
                        onClick={() => pick(it)}
                        onMouseEnter={() => setActive(i)}
                        className={cn(
                          "block transition-colors",
                          i === safeActive ? "bg-cream" : "bg-white",
                        )}
                      >
                        <SuggestRow
                          item={it}
                          active={i === safeActive}
                          locale={locale}
                        />
                      </NextLink>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => submitTerm(q.trim())}
                className="block w-full cursor-pointer border-t border-ink/10 bg-cream/60 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition hover:bg-ink hover:text-white"
              >
                {submitLabel(q.trim())}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});
