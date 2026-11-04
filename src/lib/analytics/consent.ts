export const PRIVACY_COOKIE = "misk-privacy-v1";
export const ANALYTICS_COOKIES = ["_av_id", "_as_id", "_utm_first", "_utm_last", "_is_bot", "misk-feedback-purchase"];

export function privacyChoice(value: string | undefined) {
  return value === "allow" || value === "essential" ? value : undefined;
}
