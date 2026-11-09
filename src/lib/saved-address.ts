import type { DeliveryAnswer, DeliveryCountry } from "@/lib/types";

export type SavedAddress = { id: string; address: DeliveryAnswer };

export function normalizeAddress(value: unknown): DeliveryAnswer | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const field = (key: string, max = 200) =>
    typeof row[key] === "string" ? row[key].trim().slice(0, max) : "";
  const coordinate = (key: string, limit: number) => {
    const n = row[key];
    return typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
  };
  const line = field("line"), city = field("city"), state = field("state");
  if (!line || !city || !state) return null;
  return {
    line, city, state,
    building: field("building"),
    countryCode: (field("countryCode") || field("country_code") || "AE").toUpperCase(),
    label: field("label").toLowerCase() === "work" ? "work" : "home",
    postcode: field("postcode", 30),
    lat: coordinate("lat", 90),
    lng: coordinate("lng", 180),
  };
}

export function addressKey(address: DeliveryAnswer) {
  return JSON.stringify(
    [address.countryCode, address.state, address.city, address.line, address.building, address.postcode]
      .map((value) => value.trim().replace(/\s+/g, " ").toLowerCase()),
  );
}

export function addressSummary(address: DeliveryAnswer) {
  return [...new Set([address.line, address.building, address.city, address.state, address.postcode].filter(Boolean))].join(", ");
}

export function addressIsSupported(address: DeliveryAnswer, countries: DeliveryCountry[]) {
  return countries.some((country) => country.code === address.countryCode);
}
