import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: { "/api/admin/hero-video": ["./node_modules/ffmpeg-static/**/*"] },
  async headers() {
    const headers=[{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Robots-Tag",value:"noindex, nofollow, noarchive, nosnippet"},{key:"Cache-Control",value:"private, no-store"}];
    return [{source:"/preferences/:path*",headers},{source:"/:locale(en|ar)/preferences/:path*",headers},{source:"/orders/:path*",headers},{source:"/:locale(en|ar)/orders/:path*",headers}];
  },
  images: {
    // Supabase Storage public URLs (product + banner uploads).
    // Local /products/* + /banners/* keep working with zero config.
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default withNextIntl(nextConfig);
