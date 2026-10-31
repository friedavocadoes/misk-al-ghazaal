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

`StorefrontChrome.tsx` is the sole parent-layout integration: it selects the appropriate chrome and remembers the last safe non-Originales browsing path in **sessionStorage**. It sits _below_ the existing CartProvider/WishlistProvider. The main SiteHeader is not mounted inside the capsule. `OriginalesChrome.tsx` supplies account/session status, global indexed search, language switching, the shared CartDrawer, store locator and edition rail. The collection index has **no mounted rail**: the menu opens an accessible drawer on desktop/mobile. Product pages keep the desktop rail and a mobile drawer. Direct arrivals return to the homepage; private/account/admin/auth URLs are never remembered. A normal link back restores the main storefront.

`OriginalesGallery.tsx` is a server-rendered client component with a typographic opening, manifesto and one photographed chapter per perfume. `story.ts` owns EN/AR editorial copy: atmosphere and personal expression, not invented ingredient/provenance/performance claims. GSAP supplies masked heading entrances, progressive paragraph reading and small vertical image parallax. There is no repeated bottle grid and no hover tilt.

`OriginalesProduct.tsx` owns the client presentation, quantity/options, purchase actions, actual note tooltips and below-fold story/composition. Stock/manual out-of-stock/unlimited-null rules use the same contracts as the normal PDP. Coupons, free samples, reviews, product analytics and FindInStore reuse the existing implementations. Buying with a saved coupon retains the existing guest sign-in prompt. The shared backend validates price/stock/discounts at checkout as usual.

## Animation and loading

- Native sticky scene in a 260svh runway; **no scroll hijacking, smooth-scroll engine or scroll snapping**. GSAP ScrollTrigger dynamically loads within the capsule, with product scrub1.15 and responsive matchMedia cleanup.
- Actual assigned note glyphs drift around the bottle, then shrink/fade toward its centre before the bottle travels left. Bottle/box stay upright; their old rotation tweens and hover tilts were removed.
- **Exactly one semantic H1 travels.** `[data-travelling-title]` begins behind the cap and moves down/right into `[data-title-dock]`, a non-semantic reserved space in the purchase panel. It is not replaced by a second heading or an opacity swap between different title nodes. A small JS scalar (`surface.glass`) controls the material blend; do not revert to a bare CSS-variable `.to()` that lost the initial value during refresh in browser QA. The real text span remains accessible. Purchase quantities/options/cart/coupon semantics are unchanged, with capsule-specific visual controls.
- `LiquidName.tsx` lazily imports `glass-name-renderer.ts`. This uses **@pmndrs/vanilla 1.19.0 MeshTransmissionMaterial** (MIT, from [Drei Vanilla](https://github.com/pmndrs/drei-vanilla)), the existing Three.js renderer and TextGeometry. These are actual extruded/bevelled letters with IOR/transmission, subtle chromatic aberration, a refracted backdrop-image render target and PMREM studio-light environment reflections. Sampling offsets and lighting change with the moving heading. These are reflections of the rendered environment, not captured reflections of arbitrary DOM elements. No html2canvas/DOM screenshot engine, fake SVG-outline title, continuous wobble or new React Three Fiber wrapper.
- GPU buffers remain fixed during the scroll/font-size morph; camera/mesh/sample region update instead of reallocating a render target every frame. Text renderer runs at~30fps, skips hidden/offscreen/plain-title states and loads only for eligible product views. Reduced motion, Save-Data, low reported memory, import/context/shader errors keep the **same** readable HTML title and working shopping controls. Font source and its redistribution notice are local at `public/originales/fonts/`. The 3D Latin mesh is decorative; the HTML name is the accessible identity.
- `FluidSurface.tsx`: small original WebGL procedural caustic/ripple layer driven by pointer and scroll energy; configurable `FLUID.waves`, `.viscosity` (decay) and `.resolution` in config. It is **not a Navier–Stokes fluid solver** and does not distort the DOM or affect input hit testing. We reviewed [Pavel Dobryakov's MIT WebGL fluid experiment](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation); none of its engine/source was copied or installed. Its full solver would be a separate future quality/performance decision.
- Canvas resolution capped relative to960px, about30fps, low-power context, pauses offscreen/in hidden tabs; no WebGL for reduced motion, Save-Data, <=2GB reported memory or <=2 hardware threads. Shader/context failure leaves the CSS atmosphere. Native scroll and purchase continue working.
- Initial logo veil waits for the **top images' decode**, not the full page/reviews. It releases after2.2sec even on an asset failure; a CSS escape also prevents a permanent veil without JS. Reduced motion removes the veil and long runway. Page copy, product data, links and metadata are server rendered underneath; no crawler user-agent exceptions.
- Hidden purchase controls are inert only during the animated introduction; the scroll cue provides a direct jump. Reduced motion provides a static, directly accessible purchase layout with one title. WebGL context loss removes the canvas and restores that title, never an empty heading.

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
5. Remove local artwork/font/encoding script/tests if no longer needed. Remove `@pmndrs/vanilla` with the package manager when this is its last consumer; preserve Three.js if other features still use it. The one optional sessionStorage key `mag-originales-return-v1` may be left inert or removed. **No database cleanup is needed.**
6. If moving to another domain, explicitly design account/cart integration and canonical redirects there. The current shared session relies on being inside this existing app; do not assume cross-domain cookies or carts will work automatically.

Use the existing `lib/revalidate.ts` helpers for future edits: Originales gallery/product paths are included in public/en/ar invalidation. Never add a standalone browser database write just to refresh this presentation.

## Verification

`node --test tests/originales.test.cjs` covers route membership, return-path privacy, artwork alpha/size and alternate-route refreshes. `tests/originales-presentation.browser.cjs` is opt-in live local browser QA: use an isolated Playwright install via `ORIGINALES_PLAYWRIGHT_MODULE`, optional `ORIGINALES_BROWSER_PATH` for an installed browser, and `ORIGINALES_QA_URL` (default localhost:3000), then run `node tests/originales-presentation.browser.cjs`. It uses a fresh guest context, suppresses analytics collection and never places an order. It checks the collapsed gallery, chapter reveals, actual glass activation, a single title through mid-scroll/docking/reverse, upright bottle, context-loss recovery, short mobile layout and reduced motion. Desktop/mobile emulation was validated; this is not physical-device GPU certification.
