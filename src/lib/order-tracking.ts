export const DEFAULT_TRACKING_URL = "https://maxexuae.com/tracking/";
export function canTrackOrder(status:string,number:string|null|undefined){return !!number?.trim()&&["dispatched","out_for_delivery","delivered","packed"].includes(status);}

/** A custom carrier may use {tracking} in a verified deep-link template. */
export function trackingLink(link:string|null|undefined,number:string|null|undefined):string {
  const raw=(link?.trim()||DEFAULT_TRACKING_URL).replaceAll("{tracking}",encodeURIComponent(number?.trim()||""));
  const url=new URL(raw);
  if(!["https:","http:"].includes(url.protocol)||url.username||url.password)throw new Error("Use a valid HTTP(S) courier tracking URL.");
  return url.toString();
}
