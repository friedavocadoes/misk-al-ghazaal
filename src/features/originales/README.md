# Originales — removable MAG Parfum capsule

Current presentation: **2 November 2026 (V4)**. This supersedes the earlier ivory editorial and liquid-glass versions. This is a frontend capsule with no new database schema, admin fields, Storage uploads, order system, account system or cart. Existing product data remains authoritative.

## Routes and ownership

- `/originales`: four real bottles first, followed by a continuous sticky product stage and scrolling stories/compositions. The short philosophy follows the products.
- `/originales/<existing-product-slug>`: dedicated presentation and purchase page.
- Standard `/product/<slug>` temporarily redirects only for actual `lineupSlug=originales`. `/collection/<anything>?lineup=originales` and `/collection/originales` redirect to the gallery. EN clean paths and `/ar/…` work.
- `config.ts`: enable/retirement switch, membership, edition artwork/colours and safe return-path guard. `data.ts` reads the existing active public catalog. Preserve real product slugs/IDs in cart, checkout, coupons, samples, reviews and analytics.
- `StorefrontChrome` chooses chrome **below** the existing cart/wishlist providers. Never add a second provider here. OriginalesChrome retains account/session, search, language, shared bag, store locator and safe sessionStorage return navigation. Desktop gallery rail stays unmounted; the menu drawer is available. Product pages retain the desktop edition rail.

## Presentation files

- `atelier.module.css`: the complete capsule theme, dark mineral palette, frosted all-caps Manrope typography, scene geometry, sculpture surfaces, counter and purchase controls. `Manrope` is loaded only by the Originales layout via next/font. The old `originales.module.css` was removed.
- `portal.css`: attribute-gated styles for dialogs/sample picker/note tooltips which render outside the capsule DOM. OriginalesChrome sets `body[data-originales=true]` in a layout effect and clears it before the main store paints again. Never make these styles global without that attribute.
- `OriginalesGallery`: **one persistent image element per bottle**. Four figures open as a desktop row/mobile grid. Scroll converges them into the sticky stage, hides inactive figures and shows the active product's price/add button. Right-side story, actual note glyphs, packaging and sculpture still life scroll independently. Mobile uses a compact sticky band above the story. No fixed cloning screenshots or extra bottle grids.
- `public/originales/bottle-silhouette.svg`: one code-native bottle mask, reused by CSS with four solid colours. The top nav links to each PDP; the featured section controls its highlight. Do not use four different icon assets or replace these links with inert buttons.
- `AtelierControls`: immediate stock-clamped quantity updates with decorative 3D flip transitions; a real bag button morphs to a narrower confirmation surface after a successful cart mutation. The animated number is aria-hidden; one live region announces the actual current value. Animation must never delay quantity/cart writes. Motion respects reduced motion.
- `OriginalesProduct`: one semantic H1 moves from behind the bottle cap to the reserved purchase title dock. The title is frosted CSS text, all caps; **no liquid-glass renderer**. The intro contains only backdrop, bottle and box — no floating glyphs/ingredients or fusion animation. Composition tooltips remain below, without plus icons. The intro uses a single scroll timeline over146svh: presentation → price view → left purchase dock. The native sticky scene now spans all product chapters (no pinning). The 90svh spacer after the scene preserves the initial reading space. Desktop content scrolls in the right half; mobile retains a compact product band and bottom purchase dock.
- `AtelierPanel`: shared physical-looking chapter surfaces and transparent decorative sculptures. Pointer magnetism moves only decorative artwork, within24×18px total; hit areas and text stay still. `data-parallax` art gets restrained scroll movement. Product chapters add a separate `data-art-pass` transform layer: sculptures enter in front of text, clear behind the card at the reading frame, then cross in front on departure. Keep pointer magnetism and scroll transforms on separate nodes. Pending animation frames are cleaned up.
- `useAtelierMotion`: scoped GSAP grey-to-white lighting of actual text, including asynchronously mounted coupon/sample content; decorative parallax; proximity-only section settling. It only nudges to a section top when the stopping position is within~15vh, capped140px. Forms/open dialogs suppress snapping; reduced motion disables all of these effects. Native input, wheel and touch scrolling remain available. Contexts, observers, refresh timers and RAFs are torn down per route.
- `story.ts`: EN/AR editorial mood, not fabricated ingredient, origin, longevity or manufacturing claims. Only real catalog notes appear. At original inspection only Lazvaro had assigned notes; empty compositions are omitted instead of invented.

**Retired:** LiquidName, glass-name-renderer, FluidSurface, the Helvetiker files and `@pmndrs/vanilla` were removed. Do not resurrect the V2 physical glass or flying note logic. Existing Three.js elsewhere in the app was left alone.

## V4 glass and product photography

- `AtelierProductGallery.tsx` keeps the live PNG bottle/box scene as frame zero, then offers every distinct uploaded image to its right. A variant with its own images uses those; otherwise it uses `product.images`. The variant-keyed gallery resets cleanly on option changes. Selecting an uploaded photo mounts its optimized full preview on demand; returning to frame zero restores the original scene nodes. Small thumbnails use56px image sizes. Initial bottle priority/decode logic remains unchanged.
- Gallery entry uses a scroll-driven clipped, softened glass shape resolving from the screen edge. Image changes use layered perspective, blur and curvature that settle into a two-pixel frame. Text and controls stay crisp. Motion never gates cart writes or image interaction. Selecting a photo and reversing to the opening restores the bottle regardless of the retained gallery selection.
- The exact same purchase controls dock beneath the product. Hidden option details become inert while docked, and remain available by scrolling back to the price frame. Product identity/price remain visible in the compact dock. Mobile retains touch-sized controls and a compact upper product view; reduced-motion users receive a static, accessible layout/gallery.
- Local glass styling was informed by [Apple Tahoe Liquid Glass Button](https://21st.dev/@jahed/components/apple-tahoe-liquid-glass-button): separate optical/background layers, restrained rim highlights, inset reflections, subtle backdrop blur and crisp foreground text. Its full component source requires an account; this is an original local implementation of that visual direction, not a copied/installed component. The [Liquid Effect Animation](https://21st.dev/@minhxthanh/components/liquid-effect-animation) reference informed the restrained scroll-driven background current. No external shader, runtime image service, dependency, continuous canvas loop or glass text renderer was added.
- Backdrop surfaces deliberately sit over the edition atmosphere, moving light gradients and sculptures. Product chapters use one framed surface each; the sculpture settles behind it while reading. All effects remain scoped to this removable capsule.

## Shopping and content

Prices/options/manual OOS/finite or null-unlimited stock use existing contracts. Coupons use the shared PdpOffers and eligibility endpoint. Samples use the shared SamplePicker and allowance/selection system, including persisted chosen previews; their capsule styling is scoped. Ratings/reviews and retail stores are the existing server sections passed as separate slots. The guest saved-coupon sign-in prompt and checkout validation remain intact. Do not replace these with static mock buttons.

The logo veil only waits for top imagery decode, bounded at2.2sec with a CSS escape; reduced motion bypasses it. Actual page content/metadata are server rendered. Product JSON-LD/canonicals, sitemap and public/en/ar invalidation remain integrated. No bot-specific rendering.

## Local artwork and provenance

Runtime files live under `public/originales`; PNG masters under `public/originales/source`. No runtime references point to Downloads, Temp or Codex directories.

- `<edition>-bottle.webp`, `<edition>-box.webp`: transparent cutouts generated with the built-in imagegen tool from the supplied four-product lineup photo. Occluded box parts were reconstructed. Inspect/replace with official final pack shots before launch.
- `<edition>-atmosphere.webp`: restrained abstract glass/silk backdrops in amber, emerald, burgundy and sapphire palettes. These are decorative atmospheres, not ingredient photography. Hero uses these local atmospheres so labeled composition artwork cannot reintroduce notes into the intro.
- `sculpture-fold.webp` (1100px, about136KB): champagne-bronze and smoked-crystal folded ribbon.
- `sculpture-orbit.webp` (1100px, about310KB): dark travertine organic ring with a bronze inlay/sphere. Shared by all four editions; no flower/ingredient claims and no purported photograph of an actual shop.
- `bottle-silhouette.svg`: hand-authored simple vector mask, coloured in CSS.

Sculpture images were created with the **built-in imagegen tool**, genuine transparent backgrounds, and encoded with Sharp (WebP quality88, alpha100, max1100px). Full source PNGs remain local. Prompts:

1. Fold: “A single monumental folded ribbon of smoked translucent crystal merging into brushed champagne bronze. Architectural drape, continuous balanced sculptural form, photorealistic 3D studio light, complete isolated object with narrow margins, genuine alpha. No bottle, words, flower, bubbles, pedestal or floor shadow.”
2. Orbit: “A single matte dark travertine ring with an organic opening, a thin champagne-bronze inlaid arc and a smaller polished bronze sphere nested in the hollow. Photorealistic 3D studio render with tactile mineral texture and soft rim light, complete isolated object, genuine alpha. No bottle, words, flower, logo, pedestal or floor.”

Earlier bottle/box prompts extracted each named object while preserving its cap/collar/glass colour, label/proportions/lettering; boxes reconstructed their hidden corner. Atmosphere prompts requested wide pale open-centre abstract liquid-glass/silk sculptures, with no product/words/ingredient objects. `scripts/prepare-originales-assets.mjs` records their source filenames and encodings; V3 sculpture masters are separately retained in source.

Future cutouts: genuine transparent PNG masters around1600–2200px tall, consistent margins/light/camera. Serve WebP with alpha, preferably <=350KB per cutout. Text-free backgrounds1600–1920px wide; appropriately sized next/image variants are mounted, not original source PNGs.

## Removal / move to another website

Set `ORIGINALES_ENABLED=false` and deploy to restore normal PDP/collection rendering. Capsule routes intentionally become unavailable; add explicit temporary redirects first if bookmarks must survive.

For complete removal:

1. Remove `app/[locale]/(storefront)/originales/`, `features/originales/`, local artwork and capsule tests/scripts when no longer needed.
2. Unwrap StorefrontChrome in storefront layout: restore SiteHeader, `#page-content` with optional AdminEditBar and main children, then the original Suspense footer. Retain cart/wishlist/auth/haptics/analytics/toasts.
3. Remove the capsule redirect branches from standard product and collection pages.
4. Remove alternate paths from `lib/revalidate.ts` and sitemap. Keep existing main-store public/en/ar cache invalidation.
5. The optional `mag-originales-return-v1` sessionStorage key can be removed or left inert. **No database cleanup is needed.** New-domain account/cart sharing needs a separate design; existing cookies/providers do not automatically cross domains.

## Verification

`node --test tests/originales.test.cjs` checks membership, return privacy, real assets and revalidation. Opt-in browser regression: set `ORIGINALES_PLAYWRIGHT_MODULE` to a Playwright installation, optionally `ORIGINALES_BROWSER_PATH` to an installed browser and `ORIGINALES_QA_URL` (default localhost:3000), then run `node tests/originales-presentation.browser.cjs`. It opens a fresh guest, suppresses analytics, never submits an order/review, and checks first-fold bottles, persistent scene/active silhouettes, no WebGL/flying notes, title docking, rapid quantities/cart/morph, database photograph selection/frame-zero restoration, persistent purchase docking/reverse scroll, note touch/no plus, mobile bounds/reduced motion and restoration of the main store.
