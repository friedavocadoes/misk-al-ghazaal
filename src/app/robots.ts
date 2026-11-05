import { getSitemapOrigin } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["account", "cart", "checkout", "orders", "preferences", "search", "pages/wishlist"];
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", "/api/", "/auth/",
        ...["", "/ar", "/en"].flatMap(locale => privatePaths.flatMap(path => [
          locale + "/" + path + "$", locale + "/" + path + "/", locale + "/" + path + "?",
        ])),
      ],
    }],
    sitemap: getSitemapOrigin() + "/sitemap.xml",
  };
}
