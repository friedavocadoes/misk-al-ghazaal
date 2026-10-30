/** Single registry for banner placements. Set enabled:false to retire a placement from admin and storefront queries. */
export const BANNER_PLACEMENTS = {
  hero: {
    enabled: true,
    label: "Homepage hero",
    short: "Hero",
    description: "Full-screen slides at the top of the homepage.",
    dimensions: "Desktop 1920 × 1080 · mobile 900 × 1600",
    allowVideo: true,
  },
  brand: {
    enabled: true,
    label: "Brand cards",
    short: "Brand",
    description: "Cards in the homepage brand / worlds section.",
    dimensions: "1200 × 1500 · WebP (4:5)",
    allowVideo: false,
  },
  navigation: {
    enabled: true,
    label: "Shop menu",
    short: "Menu",
    description: "The first two enabled banners appear in Our Collections.",
    dimensions: "800 × 1000 · WebP (4:5)",
    allowVideo: false,
  },
} as const;
export type BannerPlacement = keyof typeof BANNER_PLACEMENTS;
export function isBannerPlacement(value: unknown): value is BannerPlacement {
  return typeof value === "string" && Object.hasOwn(BANNER_PLACEMENTS, value);
}
export const bannerIsVideo = (url: string) =>
  /\.(mp4|webm|mov)(?:[?#]|$)/i.test(url);
export interface AdminBanner {
  id: string;
  slot: BannerPlacement;
  sort: number;
  is_active: boolean;
  title: string | null;
  title_ar?: string | null;
  src: string;
  fallback: string;
  mobile_src: string;
  mobile_fallback: string;
  href: string | null;
}
