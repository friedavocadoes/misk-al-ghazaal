# Launch image specifications

All current catalog, campaign and marketing content is placeholder content. Replace it before launch; no sample photography or copy is treated as final brand content.

Export in sRGB. Use WebP at quality 75–82 for photographs, strip EXIF metadata, and upload a new filename when replacing artwork. Dimensions below are recommended source exports; the storefront delivers responsive resized versions. File weights are targets, not enforced limits.

| Placement | Export dimensions | File type | Target weight |
|---|---|---|---|
| Hero / full-width campaign | 2400 × 1350 px | WebP | 200–350 KB |
| Product gallery / catalog | 1600 × 2000 px | WebP | 120–250 KB each |
| Collection / portrait editorial | 1200 × 1500 px | WebP | 100–200 KB |
| Split banner | 1600 × 1000 px | WebP | 150–250 KB |
| Navigation campaign | 800 × 1000 px | WebP | 60–120 KB |
| Journal / landscape card | 1200 × 800 px | WebP | 80–150 KB |
| Note glyph | 256 × 256 px, centered with 12% padding | Transparent WebP (PNG if necessary) | under 25 KB |
| Crest / logo | 352 × 352 px | Transparent WebP | under 30 KB |
| Avatar | 256 × 256 px | WebP | under 25 KB |
| Detailed notes artwork, desktop | 1800 × 1000 px | WebP | under 250 KB |
| Detailed notes artwork, mobile | 900 × 1400 px | WebP | under 200 KB |

Hero currently uses one image on desktop and mobile with cover cropping. Keep the subject in the central 35% and use the focal-point control; do not bake headings/buttons into artwork. A separate mobile source is not currently supported. Detailed notes artwork has separate desktop/mobile fields. Transparent glyph colors are preserved.

Avoid animated GIFs, embedded text in promotional images, multi-megabyte PNG photography and upscaled exports. Use real HTML copy for accessibility and search indexing. Supabase Storage uploads and local images use Next image optimization. External hosts not configured for Next retain direct delivery for compatibility. SVG defaults remain vectors.

## Loading behavior and verification

Homepage hero and lower content stream separately; individual CMS sections also have Suspense boundaries. Footer catalog work no longer blocks the page. Request-scoped React cache deduplicates repeated reads without introducing a persistent stale stock/price cache.

The branded reveal uses a small crest and CSS, waits for the first hero image decode and fonts, and releases after at most 3.5 seconds plus a fade. CSS independently releases it if hydration fails; no-JavaScript visitors see the page directly. No fake percentage, forced minimum duration, bot detection or crawler-specific content. Server-rendered text, links and structured data remain present. A visual overlay can affect perceived speed/LCP; verify real production Core Web Vitals after final artwork is uploaded.

Measure cold and warm visits on the production host with mobile network/CPU throttling. Development timings are not production performance claims. Inspect LCP, INP, CLS and transferred bytes on home, collection, PDP, cart and checkout. Do not claim universal instant loading: origin latency, device speed and customer bandwidth still matter.

## Automatic upload conversion

All application image uploads convert to lossless WebP before Supabase Storage. Dimensions and transparency are retained; EXIF orientation is applied. Existing WebP uploads are kept without another encoding pass. Lossless conversion does not restore detail already lost in a JPEG and can produce a larger file than its source; export to the dimensions above before uploading. PDF invoices are not images and remain PDF. Existing stored sample assets are not automatically migrated.
