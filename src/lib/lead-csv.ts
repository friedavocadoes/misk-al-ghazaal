export const LEAD_LABELS: Record<string, string> = {
  account: "Registered account",
  guest_order: "Guest buyer",
  newsletter: "Newsletter signup",
  manual: "Manual / CSV",
};
export function parseLeadCSV(input: string) {
  if (input.length > 2_000_000) throw Error("CSV must be under 2MB.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quote && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quote || cell === "") quote = !quote;
      else throw Error("Invalid CSV quoting");
    } else if (c === "," && !quote) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quote) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quote) throw Error("Unclosed CSV quote");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  const headers =
    rows.shift()?.map((v) =>
      v
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase(),
    ) ?? [];
  if (!headers.includes("email") || new Set(headers).size !== headers.length)
    throw Error("Use the supplied template with a unique email column.");
  if (rows.length > 1000 || !rows.length)
    throw Error("Import between 1 and 1,000 leads at a time.");
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw Error(`Row ${i + 2}: column count does not match.`);
    const get = (key: string) => r[headers.indexOf(key)]?.trim() ?? "";
    const email = get("email").toLowerCase(),
      name = get("name"),
      phone = get("phone"),
      location = get("location"),
      consent = get("marketing_consent").toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      name.length > 150 ||
      phone.length > 40 ||
      location.length > 200 ||
      !["", "yes", "no", "true", "false"].includes(consent)
    )
      throw Error(
        `Row ${i + 2}: check email, field lengths and marketing_consent (yes/no).`,
      );
    return {
      email,
      name,
      phone,
      location,
      consent: ["yes", "true"].includes(consent),
    };
  });
}
