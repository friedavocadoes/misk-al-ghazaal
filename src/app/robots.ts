import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow:["/preferences/","/ar/preferences/","/en/preferences/","/orders/","/ar/orders/","/en/orders/"] }],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
