import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage public URLs (product + banner uploads).
    // Local /products/* + /banners/* keep working with zero config.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default withNextIntl(nextConfig);
