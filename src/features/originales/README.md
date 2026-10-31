# Originales — temporary MAG Parfum capsule

This is a presentation-only storefront feature, created 31 October 2026. It deliberately has **no migration, new table, admin fields, Storage upload, payment system or second cart**. Catalog records remain the source of truth. Do not seed or rename products to maintain this presentation.

## Entry points and ownership

- `/originales`: collection gallery, no main-store navigation/filter sidebar/footer.
- `/originales/<existing-product-slug>`: the presentation and purchase experience.
- Existing `/product/<slug>` redirects here **only when the live product's `lineupSlug` is `originales`**. A similar product name alone is insufficient.
- `/collection/<anything>?lineup=originales` and `/collection/originales` redirect to the gallery. Legacy plural collection redirects continue working.
- English clean paths and `/ar/…` work. Redirects are temporary, not permanent redirects, because this feature may be removed.
- The original product URL is still the cart/search/review identifier; the new route is just a presentation address. Never replace order/cart slugs with `ambrato` etc.

`config.ts` owns the retirement switch (`ORIGINALES_ENABLED`), palette, local artwork mapping, fluid parameters and return-path validation. `data.ts` reads the existing active public catalog and filters by lineup. Unknown future Originales perfumes use their ordinary product image and a neutral palette instead of borrowing the wrong bottle.

`StorefrontChrome.tsx` is the sole parent-layout integration: it selects the appropriate chrome and remembers the last safe non-Originales browsing path in **sessionStorage**. It sits _below_ the existing CartProvider/WishlistProvider. The main SiteHeader is not mounted inside the capsule. `OriginalesChrome.tsx` supplies account/session status, global indexed search, language switching, the shared CartDrawer, stockist anchor and edition rail. On mobile the edition rail is an accessible drawer. Direct arrivals return to the homepage; private/account/admin/auth URLs are never remembered. A normal link back restores the main storefront.

`OriginalesGallery.tsx` is the server-rendered gallery. `OriginalesProduct.tsx` owns the client presentation, quantity/options, purchase actions, actual note tooltips and below-fold story/composition. Stock/manual out-of-stock/unlimited-null rules use the same contracts as the normal PDP. Coupons, free samples, reviews, product analytics and FindInStore reuse the existing implementations. Buying with a saved coupon retains the existing guest sign-in prompt. The shared backend validates price/stock/discounts at checkout as usual.

## Animation and loading

- Native sticky scene in a 260svh runway; **no scroll hijacking, smooth-scroll engine or scroll snapping**. GSAP ScrollTrigger dynamically loads only on the capsule product page, with scrub 1.15 and responsive matchMedia cleanup.
- Actual assigned note glyphs drift around the bottle, then shrink/fade toward its centre before the bottle travels left. The box enters at a slight angle. The glass title dissolves as the purchase title appears. Scroll is reversible.
- `LiquidName.tsx`: SVG translucent gradient lettering with specular edge lighting. It is a visual glass treatment, not real optical refraction through physical bottle glass. Opaque printed labels remain legible.
- `FluidSurface.tsx`: small original WebGL procedural caustic/ripple layer driven by pointer and scroll energy; configurable `FLUID.waves`, `.viscosity` (decay) and `.resolution` in config. It is **not a Navier–Stokes fluid solver** and does not distort the DOM or affect input hit testing. We reviewed [Pavel Dobryakov's MIT WebGL fluid experiment](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation); none of its engine/source was copied or installed. Its full solver would be a separate future quality/performance decision.
- Canvas resolution capped relative to960px, about30fps, low-power context, pauses offscreen/in hidden tabs; no WebGL for reduced motion, Save-Data, <=2GB reported memory or <=2 hardware threads. Shader/context failure leaves the CSS atmosphere. Native scroll and purchase continue working.
- Initial logo veil waits for the **top images' decode**, not the full page/reviews. It releases after2.2sec even on an asset failure; a CSS escape also prevents a permanent veil without JS. Reduced motion removes the veil and long runway. Page copy, product data, links and metadata are server rendered underneath; no crawler user-agent exceptions.
- The large presentation SVG is decorative; the real product H1 and price remain in HTML. Hidden purchase controls are inert only during the animated introduction; the scroll cue provides a direct jump. Reduced motion provides a static, directly accessible purchase layout.

## Artwork and product content

Served artwork: `public/originales/<name>-bottle.webp`, `-box.webp`, `-atmosphere.webp`. Full generated PNGs: `public/originales/source/`. Four editions: Ambrato, Sultanic, Lustra, Lazvaro. No generated output is referenced from a user temp directory or Codex directory.

When existing product notes artwork is present, `notesImageDesktop` / `notesImageMobile` supplies the hero backdrop instead. DeviceBannerImage mounts only the selected device source; the local atmosphere remains the fallback. This reuses existing catalog fields without introducing a temporary backend setting.

The eight cutouts were made with the **built-in imagegen tool**, using the supplied `Four Originales Perfume Pairs in Stone Gallery(1).png` as edit reference. Bottles retain their identity; boxes required reconstruction of portions hidden by the bottles. These are generated reconstructions, not guaranteed pixel-identical technical packaging scans. Inspect/replace with official pack shots before final publication. The four abstract backdrops are generated liquid-glass/silk atmospheres in each edition's palette. They intentionally make **no unverified ingredient claims**.

Prompt set:

1. For each of AMBRATO / SULTANIC / LUSTRA / LAZVARO: “Extract ONLY this perfume BOTTLE from the supplied lineup, centred upright full-object transparent PNG. Preserve the rectangular black cap, collar, glass colour, label, proportions and lettering. Remove all boxes, stone, floor and reflections; genuine alpha; do not redesign.”
2. For each edition: “Extract ONLY this black presentation BOX; remove the foreground bottle and reconstruct its occluded corner. Subtle three-quarter angle, embossed texture, original O insignia, edition name, ORIGINALES, EXTRAIT DE PARFUM and coloured ribbon illustration. No other objects or outside shadows; genuine transparent alpha.”
3. For each edition: “Wide cinematic luxury perfume backdrop, translucent liquid-glass/silk sculpture underwater, caustics and luminous mist; flowing material toward the sides with open pale centre. No bottle, box, ingredient objects, text or logo.” Palettes: amber/sandstone/champagne; emerald/sage/limestone; burgundy/rose/alabaster; sapphire/glacial-blue/pearl.

`scripts/prepare-originales-assets.mjs <imagegen-output-directory>` records exact generated filenames and produces optimized WebP with alpha preserved (cutout height1100px, quality92/alpha100; atmosphere width1600px, quality85). It only re-encodes local files. Runtime next/image supplies appropriately sized variants; original PNGs are not requested by the interface. Keep future source bottles/boxes around1600–2200px tall with genuine alpha, tight consistent margins and identical lighting/view angle. Serve WebP with alpha, ideally <=350KB per cutout. Backgrounds1600–1920px wide, ideally <=250KB; avoid burned-in text.

**Current catalog condition:** read-only inspection found notes assigned only to Lazvaro (Amber, Aquatic, Citrus, Musk). The other three correctly omit empty compositions rather than inventing notes. Short description/story uses current product copy, with generic non-olfactory fallback. Adding real notes/translated descriptions to the existing product editor populates this experience. To add photorealistic floating ingredients later, use separate transparent renders (one per genuine assigned note), resolve those in a local mapping in this module, and retain the same actual note name/description/tooltip. Do not draw a made-up formula into a banner.

## Integration and removal checklist

To temporarily disable: set `ORIGINALES_ENABLED=false` in config and deploy. Standard PDPs and lineup collection filters then render normally; the `/originales` routes intentionally become unavailable. If bookmarks must survive, replace their layouts/pages with temporary redirects before deleting the routes.

For complete removal/migration to a separate site:

1. Remove `/app/[locale]/(storefront)/originales/` and `src/features/originales/` after handling any desired URL redirects.
2. In storefront layout unwrap StorefrontChrome: restore SiteHeader before `#page-content`, the optional edit bar then `<main>{children}</main>`, and the existing Suspense SiteFooter after it. Keep CartProvider, WishlistProvider, haptics, analytics, toasts and auth unchanged.
3. Remove Originales redirect imports/branches from `product/[slug]/page.tsx` and `collection/[slug]/page.tsx`.
4. Remove the Originales hooks in `lib/revalidate.ts` and the alternate product paths/gallery entry in `app/sitemap.ts`. Existing standard revalidation must remain.
5. Remove local artwork/encoding script/tests if no longer needed. The one optional sessionStorage key `mag-originales-return-v1` may be left inert or removed. **No database cleanup is needed.**
6. If moving to another domain, explicitly design account/cart integration and canonical redirects there. The current shared session relies on being inside this existing app; do not assume cross-domain cookies or carts will work automatically.

Use the existing `lib/revalidate.ts` helpers for future edits: Originales gallery/product paths are included in public/en/ar invalidation. Never add a standalone browser database write just to refresh this presentation.
