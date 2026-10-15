"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Home, Loader2, LocateFixed, MapPin, Briefcase } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { tx } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { DeliveryAnswer, DeliveryCountry } from "@/lib/types";
import type { PinnedPoint } from "./MapPicker";

const MapPicker = dynamic(() => import("./MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse border border-ink/15 bg-sand md:h-72" />,
});

interface NominatimAddress {
  country_code?: string;
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  postcode?: string;
}

async function reverse(lat: number, lng: number): Promise<NominatimAddress | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { address?: NominatimAddress };
    return j.address ?? null;
  } catch {
    return null;
  }
}

export interface DeliveryInitial {
  line?: string;
  building?: string;
  countryCode?: string;
  state?: string;
  city?: string;
  postcode?: string;
  label?: string;
  lat?: number | null;
  lng?: number | null;
}

export function DeliveryAddress({
  locale,
  countries,
  onChange,
  initial,
}: {
  locale: Locale;
  countries: DeliveryCountry[];
  onChange: (answer: DeliveryAnswer, valid: boolean) => void;
  /** Last-used address: pre-fills every field once (still fully editable). */
  initial?: DeliveryInitial | null;
}) {
  const t = useTranslations("Checkout");
  const [label, setLabel] = useState<"home" | "work">(
    initial?.label === "Work" || initial?.label === "work" ? "work" : "home",
  );
  const [line, setLine] = useState(initial?.line ?? "");
  const [building, setBuilding] = useState(initial?.building ?? "");
  const [countryCode, setCountryCode] = useState(
    initial?.countryCode ??
      countries.find((c) => c.code === "AE")?.code ?? countries[0]?.code ?? "",
  );
  const [state, setState] = useState(initial?.state ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [point, setPoint] = useState<PinnedPoint | null>(
    typeof initial?.lat === "number" && typeof initial?.lng === "number"
      ? { lat: initial.lat, lng: initial.lng }
      : null,
  );
  const [geoBusy, setGeoBusy] = useState(false);
  const [mapError, setMapError] = useState("");

  const country = countries.find((c) => c.code === countryCode);
  const stateWord = countryCode === "AE" ? t("emirate") : t("region");

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: tx(c.name, c.nameAr, locale),
        keywords: [c.name, c.nameAr ?? "", c.code],
      })),
    [countries, locale],
  );
  const stateOptions = useMemo(
    () =>
      (country?.states ?? []).map((s) => ({
        value: s.en,
        label: tx(s.en, s.ar, locale),
        keywords: [s.en, s.ar ?? ""],
      })),
    [country, locale],
  );

  const applyPin = async (p: PinnedPoint) => {
    setPoint(p);
    setMapError("");
    const addr = await reverse(p.lat, p.lng);
    if (!addr?.country_code) return;
    const code = addr.country_code.toUpperCase();
    const match = countries.find((c) => c.code === code);
    if (!match) {
      setMapError(t("deliveryNo"));
      return;
    }
    setCountryCode(match.code);
    const want = [addr.state ?? "", addr.city ?? "", addr.town ?? ""].join(" ").toLowerCase();
    const hit = match.states.find(
      (s) => want.includes(s.en.toLowerCase()) || (s.ar && want.includes(s.ar)),
    );
    if (hit) setState(hit.en);
    setCity(addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.suburb ?? "");
    setPostcode(addr.postcode ?? "");
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        void applyPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGeoBusy(false),
      { timeout: 10000 },
    );
  };

  const answer: DeliveryAnswer = {
    label,
    line: line.trim(),
    building: building.trim(),
    countryCode,
    state,
    city: city.trim(),
    postcode: postcode.trim(),
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
  };
  const valid = !!line.trim() && !!countryCode && !!state && !!city.trim() && !mapError;

  useEffect(() => {
    onChange(answer, valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, line, building, countryCode, state, city, postcode, point, mapError]);

  const inputCls =
    "w-full rounded-[2px] border border-ink/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-fog focus:border-gold focus:outline-none";

  return (
    <div>
      {/* Home / Work */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("addrLabel")}>
        {(
          [
            { id: "home", label: t("home"), Icon: Home },
            { id: "work", label: t("work"), Icon: Briefcase },
          ] as const
        ).map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setLabel(o.id)}
            aria-pressed={label === o.id}
            className={`flex cursor-pointer items-center justify-center gap-2 border px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] transition ${
              label === o.id ? "border-ink bg-ink text-white" : "border-ink/20 bg-white text-espresso hover:border-ink"
            }`}
          >
            <o.Icon className="size-4" />
            {o.label}
          </button>
        ))}
      </div>

      {/* Map pin */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">{t("addrPin")}</p>
          <button
            type="button"
            onClick={locateMe}
            disabled={geoBusy}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold transition hover:text-ink disabled:opacity-50"
          >
            {geoBusy ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
            {t("addrLocate")}
          </button>
        </div>
        <MapPicker point={point} onPin={(p) => void applyPin(p)} />
        <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-fog">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold" />
          {point
            ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
            : t("addrMapHint")}
        </p>
        {mapError && (
          <p className="mt-2 border border-[#9c2b2e]/40 bg-[#9c2b2e]/[0.06] p-3 text-[13px] text-[#9c2b2e]">
            {mapError}
          </p>
        )}
      </div>

      {/* Structured fields */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <span className="sm:col-span-2">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{t("address")} *</span>
          <input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Jumeirah Street, near…" className={inputCls} />
        </span>
        <span className="sm:col-span-2">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{t("addrBuilding")}</span>
          <input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Bldg 12, Flat 304" className={inputCls} />
        </span>
        <span>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{t("addrCountry")} *</span>
          <Combobox
            value={countryCode}
            onChange={(v) => {
              setCountryCode(v);
              setState("");
              setMapError("");
            }}
            options={countryOptions}
            placeholder={t("addrCountry")}
            searchPlaceholder={t("addrSearch")}
            emptyText={t("addrEmpty")}
            ariaLabel={t("addrCountry")}
          />
        </span>
        <span>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{stateWord} *</span>
          <Combobox
            value={state}
            onChange={setState}
            options={stateOptions}
            placeholder={stateWord}
            searchPlaceholder={t("addrSearch")}
            emptyText={t("addrEmpty")}
            ariaLabel={stateWord}
          />
        </span>
        <span>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{t("city")} *</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
        </span>
        <span>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{t("addrPostcode")}</span>
          <input value={postcode} onChange={(e) => setPostcode(e.target.value)} dir="ltr" className={inputCls} />
        </span>
      </div>
    </div>
  );
}
