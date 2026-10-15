/** International dial codes for the account phone field (GCC first,
    then the most common expat origins). Stored phones are E.164-ish:
    "+971 527427627" — splitPhone() recovers code + national part. */

export interface DialCode {
  code: string;
  country: string;
}

export const DIAL_CODES: DialCode[] = [
  { code: "971", country: "UAE" },
  { code: "966", country: "Saudi Arabia" },
  { code: "974", country: "Qatar" },
  { code: "965", country: "Kuwait" },
  { code: "973", country: "Bahrain" },
  { code: "968", country: "Oman" },
  { code: "91", country: "India" },
  { code: "92", country: "Pakistan" },
  { code: "63", country: "Philippines" },
  { code: "880", country: "Bangladesh" },
  { code: "20", country: "Egypt" },
  { code: "962", country: "Jordan" },
  { code: "961", country: "Lebanon" },
  { code: "964", country: "Iraq" },
  { code: "98", country: "Iran" },
  { code: "93", country: "Afghanistan" },
  { code: "94", country: "Sri Lanka" },
  { code: "977", country: "Nepal" },
  { code: "62", country: "Indonesia" },
  { code: "60", country: "Malaysia" },
  { code: "1", country: "USA / Canada" },
  { code: "44", country: "UK" },
  { code: "61", country: "Australia" },
  { code: "49", country: "Germany" },
  { code: "33", country: "France" },
  { code: "90", country: "Türkiye" },
];

export const DEFAULT_DIAL = "971";

/** "+971 527427627" → { dial: "971", national: "527427627" }.
    Unknown/no stored value falls back to UAE + "". */
export function splitPhone(stored: string | null | undefined): {
  dial: string;
  national: string;
} {
  const digits = (stored ?? "").replace(/\D/g, "");
  if (!digits) return { dial: DEFAULT_DIAL, national: "" };
  const codes = [...DIAL_CODES.map((d) => d.code)].sort((a, b) => b.length - a.length);
  for (const c of codes) {
    if (digits.startsWith(c) && digits.length > c.length) {
      const rest = digits.slice(c.length).replace(/^0/, "");
      return { dial: c, national: rest };
    }
  }
  return { dial: DEFAULT_DIAL, national: digits.replace(/^0/, "") };
}

/** dial + national → "+971 527427627" (or "" when no number typed). */
export function combinePhone(dial: string, national: string): string {
  const n = national.replace(/\D/g, "").replace(/^0+/, "");
  if (!n) return "";
  return `+${dial.replace(/\D/g, "")} ${n}`;
}
