/** International numbers only; UAE local mobiles are normalized only with AE context. */
export function whatsappPhone(value: string, country = ""): string | null {
  let n = value.trim().replace(/[\s().-]/g, "");
  if (n.startsWith("00")) n = "+" + n.slice(2);
  if (country === "AE" && /^05\d{8}$/.test(n)) n = "+971" + n.slice(1);
  if (!/^\+[1-9]\d{7,14}$/.test(n)) return null;
  return n.slice(1);
}

export function templateParameters(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 10 ||
    value.some((v) => typeof v !== "string" || !v.trim() || v.length > 500) ||
    value.join("").length > 1024
  )
    throw Error(
      "Use up to ten non-empty text parameters (1,024 characters combined).",
    );
  return value.map((v) => v.trim().replace(/[\r\n\t]+/g, " "));
}

export function whatsappTemplate(
  name: string,
  language: string,
  parameters: string[],
) {
  if (
    !/^[a-z0-9_]{1,512}$/.test(name) ||
    !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(language)
  )
    throw Error("Enter an approved template name and language code.");
  return {
    name,
    language: { code: language },
    ...(parameters.length
      ? {
          components: [
            {
              type: "body",
              parameters: parameters.map((text) => ({ type: "text", text })),
            },
          ],
        }
      : {}),
  };
}

export function isWhatsAppStop(text: string) {
  return /^(stop|unsubscribe|cancel|إلغاء|الغاء|توقف)$/i.test(text.trim());
}
