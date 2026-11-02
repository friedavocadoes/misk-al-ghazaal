import "server-only";
import { cache } from "react";
import { getProducts } from "@/lib/store";
import { EDITIONS, isOriginales } from "./config";

export const getOriginalesProducts = cache(async () => {
  const order = Object.keys(EDITIONS);
  return (await getProducts()).filter(isOriginales).sort((a, b) => {
    const index = (slug: string) => {
      const i = order.findIndex((name) => slug.includes(name));
      return i < 0 ? 99 : i;
    };
    return index(a.slug) - index(b.slug);
  });
});
