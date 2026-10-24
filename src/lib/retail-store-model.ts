import type { RetailStore, StoreAssignment } from "./types";
export type { RetailStore, StoreAssignment } from "./types";
export function carriesProduct(store:Pick<RetailStore,"active"|"all_products">,assignment?:Pick<StoreAssignment,"available">) {
  return store.active && (assignment?.available ?? store.all_products);
}
export function validGoogleMapsUrl(value:string):boolean {
  if(!value)return true;
  try {
    const url=new URL(value);
    if(url.protocol!=="https:" || url.username || url.password || url.port)return false;
    return ((url.hostname==="google.com"||url.hostname==="www.google.com") && /^\/maps(?:\/|$)/.test(url.pathname)) ||
      url.hostname==="maps.google.com" || url.hostname==="maps.app.goo.gl" ||
      (url.hostname==="goo.gl" && url.pathname.startsWith("/maps/"));
  } catch {return false;}
}
export function storeMapUrl(store:Pick<RetailStore,"maps_url"|"name"|"address"|"location">):string {
  if(store.maps_url && validGoogleMapsUrl(store.maps_url))return store.maps_url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.name,store.address,store.location].filter(Boolean).join(", "))}`;
}
