# Originales — removable MAG Parfum capsule

Current presentation: **2 November 2026 (V9)**. This supersedes the earlier ivory editorial and liquid-glass versions. This is a frontend capsule with no new database schema, admin fields, Storage uploads, order system, account system or cart. Existing product data remains authoritative.

### Collection refinement — 5 November 2026

- The collection purchase heading fades and rises slightly when the featured edition changes during the bottle dissolve. It shares CSS timing with the bag button tint and skips the name animation for reduced motion. Collection composition cards group assigned notes by top, heart and base, omitting empty stages.
- CollectionBottle's clipped SVG bands overlap by 3 source-frame units to prevent dark sampling seams at fractional display scales. Keep the matching source bleed when changing this overlap.

- The collection title and shared navbar wordmark reuse the existing optimized Manrope, matching the soft product-name direction. The Cormorant font face, WOFF2 and license asset have been removed. The transition credit also uses the existing font stack. Keep the product hero typography unchanged.
- MAG and PARFUM inherit the same type size. Desktop product chrome keeps a compact stacked wordmark within its existing rail; collection chrome uses the horizontal wordmark.
- The Originales collection/navbar wordmark retains its Manrope metrics with a shared champagne-metal gradient and a hover glimmer on the navbar mark. MAG PARFUM is 24px on desktop collection chrome and 18px in the stacked product mark. Collection note tiles use 12px corners. NoteTooltip's optional tint passes through TooltipCard's portal style so the popup surface, rim, glyph well and arrow inherit that perfume's colour. The main-store tooltip palette is unchanged.
- The sticky collection purchase control persists across chapters. Its background colour transitions over 0.9s while the real product/variant destination updates immediately. Confirmation state belongs to the product actually added, so moving to another chapter never shows a false confirmation.
- Bottle handoffs share one eased cross-dissolve with **no positional drift**. Desktop handoffs span 48vh and mobile handoffs span at least 180px of scroll. Preserve the original persistent figure/image nodes, immediate cart actions, native touch scrolling and reduced-motion fallback.
- `CollectionBottle.tsx` registers the four local cutouts to one620×1000 frame using four small SVG viewports. Cap, collar, label O (y520) and base coincide despite different source margins/proportions. The SVG references the existing next/image currentSrc after decode, sharing the same image download and decoded resource. No new raster assets, canvas, pixel readbacks or per-frame geometry measurement. Coordinate metadata belongs only to these local1100px images; update it if replacing the source cutouts. PDP imagery and source files remain unchanged.
- Desktop poses use the measured space above the purchase block with a24px gap. With no handoff drift to reserve, larger artwork and smaller identity text give the bottles priority. Measurements happen at setup/refresh, never during scroll frames; reduced motion uses the same fitted geometry.
- The opening scroll cue uses small spaced copy and a restrained animated SVG stroke near the bottom of the opening. Its animation is disabled for reduced motion.

## Routes and ownership

- `/originales`: four real bottles first, followed by a continuous sticky product stage and scrolling stories/compositions. The short philosophy follows the products.
- `/originales/<existing-product-slug>`: dedicated presentation and purchase page.
- Standard `/product/<slug>` temporarily redirects only for actual `lineupSlug=originales`. `/collection/<anything>?lineup=originales` and `/collection/originales` redirect to the gallery. EN clean paths and `/ar/…` work.
- `config.ts`: enable/retirement switch, membership, edition artwork/colours and safe return-path guard. `data.ts` reads the existing active public catalog. Preserve real product slugs/IDs in cart, checkout, coupons, samples, reviews and analytics.
- `StorefrontChrome` chooses chrome **below** the existing cart/wishlist providers. Never add a second provider here. OriginalesChrome retains account/session, search, language, shared bag, store locator and safe sessionStorage return navigation. Desktop gallery rail stays unmounted; the menu drawer is available. Product pages retain the desktop edition rail.

## Presentation files

- `atelier-scroll.ts` owns the capsule’s GSAP ScrollSmoother instance (0.24s catch-up on the collection and 0.18s on product pages, desktop fine pointers only). It keeps the existing stage geometry and section links in the smoothed viewport and releases wrapper-bound triggers on exit. Touch and reduced-motion browsing use native scrolling.

- `atelier.module.css`: the complete capsule theme, dark mineral palette, frosted all-caps Manrope typography, scene geometry, sculpture surfaces, counter and purchase controls. `Manrope` is loaded only by the Originales layout via next/font. The old `originales.module.css` was removed.
- `portal.css`: attribute-gated styles for dialogs/sample picker/note tooltips which render outside the capsule DOM. OriginalesChrome sets `body[data-originales=true]` in a layout effect and clears it before the main store paints again. Never make these styles global without that attribute.
- `OriginalesGallery`: **one persistent figure and source image per bottle**, with CollectionBottle's registered SVG presentation sharing that loaded source. Four figures open as a desktop row/mobile grid. Scroll converges them into the sticky stage and shows the active product's price/add button. Chapter handoffs dissolve in the same registered frame. The closing philosophy is a separate full-width surface: the whole product stage exits and its SVG frame widens with scroll. Right-side stories and actual note glyphs remain live. Mobile uses a compact sticky band above the story. No extra bottle grids.
- `public/originales/bottle-silhouette.svg`: one code-native bottle mask, reused by CSS with four solid colours. The top nav stays hidden/inert over the opening, then fades/slides in when the first perfume chapter reaches75% of the viewport (and hides on reverse scroll). It links to each PDP; the featured section controls its highlight. Do not use four different icon assets or replace these links with inert buttons.
- `AtelierControls`: immediate stock-clamped quantity updates with decorative 3D flip transitions; a real bag button morphs to a narrower confirmation surface after a successful cart mutation. The animated number is aria-hidden; one live region announces the actual current value. Animation must never delay quantity/cart writes. Motion respects reduced motion.
- `OriginalesProduct`: one semantic H1 moves from behind the bottle cap to the reserved purchase title dock. The title is all-caps Manrope800 with a soft lavender/stone gradient, settling to regular400 solid ivory as it docks; **no liquid-glass renderer**. Its data-static-ink marker prevents shared text lighting from competing with this transition. Mobile changes typography without moving the product pose. The intro contains only backdrop, bottle and box — no floating glyphs/ingredients or fusion animation. Composition tooltips remain below, without plus icons. The intro uses a single scroll timeline over182svh: presentation → price view → left purchase dock. The native sticky scene now spans all product chapters (no pinning). The 90svh spacer after the scene preserves the initial reading space. Desktop content scrolls in the right half; mobile uses a stable normal-flow layout with a conditional bottom purchase bar.
- `AtelierPanel`: semantic chapter + optical surface. `MorphFrame` draws the actual SVG contour and trace. Chapter cards keep a static SVG contour, with one lightweight heading reveal per desktop card. Text/hit areas never scale with a frame.
- `useAtelierMotion`: scoped GSAP grey-to-white lighting of actual text, including asynchronously mounted coupon/sample content; SVG contour/drawn-frame/heading reveals and magnetic section settling. Gallery pages retain proximity-only settling. Desktop product pages use shared motion-config.ts price/dock stops at112svh/182svh (plus opening0), and stronger magnetic chapter reading frames within55vh. Long chapter reading bodies and the footer retain free scrolling. Mobile uses only gentle proximity settling, with no product pose animation. Forms/open dialogs suppress snapping; reduced motion disables all of these effects. Native input, wheel and touch scrolling remain available. Contexts, observers, refresh timers and RAFs are torn down per route.
- `story.ts`: EN/AR editorial mood, not fabricated ingredient, origin, longevity or manufacturing claims. Only real catalog notes appear. At original inspection only Lazvaro had assigned notes; empty compositions are omitted instead of invented.

**Retired:** LiquidName, glass-name-renderer, FluidSurface, the Helvetiker files and `@pmndrs/vanilla` were removed. Do not resurrect the V2 physical glass or flying note logic. Three.js is now used only for the supplied decorative model; the retired glass-text and procedural-fluid renderers remain removed.

## Glass, morphing controls and product photography

- `AtelierProductGallery.tsx` keeps the live PNG bottle/box scene as frame zero, then offers every distinct uploaded image to its right. A variant with its own images uses those; otherwise it uses `product.images`. The variant-keyed gallery resets cleanly on option changes. Price-pose bottle/box dimensions reserve real clear space for the rail: photographs use the same visual well, a small perspective counter sits beneath it, then thumbnails below both cutouts. The initial composition/photo well is vertically centered with full pricing; only the compact transition moves it upward and creates room for the lower purchase dock. Counter/rail/aperture slots tween with that transition. The later purchase dock sits below that rail; short desktop viewports use smaller controls. GSAP Flip fits one moving selection outline to the current thumbnail. Selecting an uploaded photo mounts its optimized full preview on demand; returning to frame zero restores the original scene nodes. Small thumbnails use56px image sizes. Initial bottle priority/decode logic remains unchanged.
- Gallery entry completes during the full price view, before the compact transition. One square aperture is aligned to the existing bottle stage; uploaded photographs cross-dissolve in place with restrained blur, without a popup, bordered canvas, perspective card or crop. Natural aspect ratios use object-contain. Aperture layout lives on a plain wrapper so Motion cannot override its centering. Returning to frame zero restores the same bottle/box nodes. Text and controls stay crisp. Motion never gates cart writes or image interaction. Selecting a photo and reversing to the opening restores the bottle regardless of the retained gallery selection.
- The exact same purchase controls dock beneath the product. Hidden option details become inert while docked, and remain available by scrolling back to the price frame. Product identity/price remain visible in the compact dock. Mobile uses a normal-flow, explicitly composed bottle/box stage, inline gallery and full price block. It never reuses desktop scroll transforms or floating bottle positions. A small state-sharing bottom purchase bar appears only after the full purchase block scrolls above the header and disappears before the footer/when returning; the offscreen original controls are inert while the bar is active. Reduced-motion users receive a static, accessible layout/gallery.
- Local glass styling was informed by [Apple Tahoe Liquid Glass Button](https://21st.dev/@jahed/components/apple-tahoe-liquid-glass-button): separate optical/background layers, restrained rim highlights, inset reflections, subtle backdrop blur and crisp foreground text. Its full component source requires an account; this is an original local implementation of that visual direction, not a copied/installed component. The [Liquid Effect Animation](https://21st.dev/@minhxthanh/components/liquid-effect-animation) reference informed the restrained scroll-driven background current.
- Backdrop surfaces deliberately sit over the edition atmosphere, moving light gradients and sculptures. Product chapters use one SVG-framed surface each. MorphFrame/EditionEmblem and the bag seal use actual GSAP MorphSVG paths; the quantity dial rotates on each real value change. The bag text/quantity updates remain immediate; animation never controls stock/cart writes. All effects remain scoped to this removable capsule.

## V7 focus, shaped surfaces and closing materials

- The SVG path itself paints each chapter/card gradient. `.panelContent`/`.editionCard` have no rectangular background/backdrop-filter. A separate `data-glass-blur` layer now restores18px blur (12px mobile) clipped by a matching SVG objectBoundingBox path. Frame, blur mask and closing trace morph together, so frosted reflections remain visible without dark rectangular corners. Keep the canonical backdrop-filter rule: duplicate prefixed/unprefixed declarations were dropped by this CSS pipeline during QA. Text remains outside the optical path; SVG frame/trace geometry morph together in the wide closing section.
- `AtelierBagButton` shares one visual/hover/morph system for `action="bag"` and `action="purchase"`, including the mobile bar. Bag icon → confirmation check; purchase uses a receipt/order icon. Pending/stock/cart/guest-coupon behavior stays real and unchanged. The two buttons have equal geometry rather than an unrelated underlined purchase link.
- `AtelierProductGallery` reuses the existing standard-store `ProductLens` only for uploaded photographs, never for the bottle/box hero composition. Fine-pointer hover smoothly enlarges the existing aperture, removes controls from interaction and fades surrounding chrome/details; a visual name remains sharp. Escape/pointer leave/window blur/scroll/close/unmount restore the ordinary view. Touch users tap a photo to focus and use the close control to exit. This is still the same inline gallery; no popup or extra provider. Snap is suppressed while inspecting.
- `FinaleDecor.tsx` intentionally reintroduces one legacy fold PNG only at the end (reviews and the full-width collection philosophy), with GSAP depth/parallax/rotation and a fine SVG counterform morph. This is not alternating scenery on every card. Text stays above the decorative material and hit areas remain still. Existing source WebP/PNG provenance below applies.

## Procedural studio backdrop

All editions use the shared canvas and SVG ribbon scene, with edition-specific palettes. The original liquid renderer and its package were removed.

## V9 compact composition, tooltip and purchase flow

- The PDP composition uses one heading and compact stage rows: a small opening/heart/base label beside wrapping54px glyphs and names, with48px glyphs on phones. Actual assigned notes remain unlimited and empty stages stay omitted. No screen-height minimum on this section. Tooltip outer Popover.Content is transparent in the capsule; its rounded inner surface clips content, and its arrow matches the dark fill. The old generic role=dialog background was painting square corners outside the rounded inner note card.
- Normal guest purchase continues straight to checkout. A saved coupon that needs authentication now turns the button into “Sign in & continue” with a real login destination; the former couponLogin guard silently returned on later clicks. Session lookup uses the cached client session for this UI hint; backend checkout coupon/auth validation stays authoritative. React navigation transition state handles pending controls. Continuing after removing the saved coupon reuses the already-saved bag rather than adding it a second time.
- Browser QA checks compact note height, rounded tooltips, and purchase destinations without submitting orders.

## Loading and route boundaries

`OriginalesLoading.tsx` provides the shared frosted veil and bottle mark. `RouteProgress` keeps one veil mounted from a capsule navigation until the destination route reports ready, then fades it out. The route veil masks nested loader surfaces, and direct entry still uses the same design through the loading boundaries. Storefront product links should use `storefrontProductPath` when lineup membership is available so Originales links bypass the standard PDP loading boundary. Product arrival waits for the opening image decode, bounded by its existing timeout.

## Shopping and content

Prices/options/manual OOS/finite or null-unlimited stock use existing contracts. Coupons use the shared PdpOffers and eligibility endpoint. Samples use the shared SamplePicker and allowance/selection system, including persisted chosen previews; their capsule styling is scoped. Ratings/reviews and retail stores are the existing server sections passed as separate slots. The guest saved-coupon sign-in prompt and checkout validation remain intact. Do not replace these with static mock buttons.

`OriginalesLoadingMark` morphs a lightweight SVG bottle into a perfume drop and back using the shared GSAP/MorphSVG loader. It pauses when the document is hidden and uses a static silhouette for reduced motion; the product arrival mark unmounts as soon as readiness resolves. No artificial loading delay.

Originales product pages intentionally omit coupon panels and their data fetch. Main-store coupons and saved-code checkout handoff remain unchanged. The shared sculpture restores polished metallic reflections (metalness1/roughness.2/clearcoat.45), with exposure.75 and50% canvas opacity retaining a quiet backdrop.

The logo veil only waits for top imagery decode, bounded at2.2sec with a CSS escape; reduced motion bypasses it. Actual page content/metadata are server rendered. Product JSON-LD/canonicals, sitemap and public/en/ar invalidation remain integrated. No bot-specific rendering.

## V11 layout and motion corrections

- Reading stops use actual editionCard/panelContent edges instead of padded section wrappers. Desktop gallery cards align to the collapsed bottle top (stage top +36% stage height -20vh). Stronger proximity catches intermediate scrolls; long reading bodies, forms and the footer retain free native scrolling.
- Opening padding no longer reserves the hidden silhouette strip (116px desktop/94px mobile including the header). Navigation reveals without adding layout space.
- Reviews use the available card width: narrow surfaces stack composer/reviews with five flexible star targets. A760px container can use two columns. Shared review/auth/moderation logic is unchanged; decorative material is smaller and kept at the corner.
- The moving title derives colour from each edition's accent/wash, with72% opening opacity resolving to solid regular ivory. Mobile opens with a full-screen bottle/name, then the same semantic H1 moves into normal-flow purchase details. The box is hidden in the mobile hero; uploaded photos remain available from the rail.
- Mobile cards use natural content heights and tighter spacing.
- atelierGsap registers CustomEase atelier-soft(.45,0,.2,1) and atelier-settle(.22,.75,.18,1). Capsule GSAP, Motion controls and scoped CSS timing use cubic curves with reduced-motion support. No global GSAP defaults or main-store timing overrides.
- The collection menu Sheet anchors left with matching keyframes. Shared storefront haptics already cover button ticks; menu/search/bag triggers request the subtle open pattern, menu closing uses close. Preference/device fallbacks remain; no scroll haptics.

## Local artwork and provenance

Runtime files live under `public/originales`; PNG masters under `public/originales/source`. No runtime references point to Downloads, Temp or Codex directories.

- `<edition>-bottle.webp`, `<edition>-box.webp`: transparent cutouts generated with the built-in imagegen tool from the supplied four-product lineup photo. Occluded box parts were reconstructed. Inspect/replace with official final pack shots before launch.
- `<edition>-atmosphere.webp`: restrained abstract glass/silk backdrops in amber, emerald, burgundy and sapphire palettes. These are decorative atmospheres, not ingredient photography. Hero uses these local atmospheres so labeled composition artwork cannot reintroduce notes into the intro.
Legacy (retained source/asset history, no longer mounted in Originales):

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
2. Unwrap StorefrontChrome in storefront layout: restore SiteHeader, `#page-content` with optional AdminEditBar and main children, then the original Suspense footer. Retain cart/wishlist/auth/haptics/analytics/toasts. Remove the OriginalesLoadingBoundary wrapper/import from the parent storefront loading file when deleting the capsule directory; retain its normal skeleton.
3. Remove the capsule redirect branches from standard product and collection pages.
4. Remove alternate paths from `lib/revalidate.ts` and sitemap. Keep existing main-store public/en/ar cache invalidation.
5. The optional `mag-originales-return-v1` sessionStorage key can be removed or left inert. **No database cleanup is needed.** New-domain account/cart sharing needs a separate design; existing cookies/providers do not automatically cross domains.

## Verification

`node --test tests/originales.test.cjs` checks membership, return privacy, real assets and revalidation. Opt-in browser regression: set `ORIGINALES_PLAYWRIGHT_MODULE` to a Playwright installation, optionally `ORIGINALES_BROWSER_PATH` to an installed browser and `ORIGINALES_QA_URL` (default localhost:3000), then run `node tests/originales-presentation.browser.cjs`. It opens a fresh guest, suppresses analytics, never submits an order/review, and checks first-fold bottles, persistent scene/active silhouettes, no hero glass-text renderer/flying notes, SVG seal morph, thumbnail clearance, shared studio motion pause/re-entry and clipped glass blur, compact composition/tooltip and buy-now destinations, full-width closing/product exit, image focus/lens/escape and transparent corners, title docking, rapid quantities/cart/morph, database photograph selection/frame-zero restoration, magnetic price/dock stops, square photos alongside full pricing, persistent purchase docking/reverse scroll, normal-flow mobile composition/conditional bar, note touch/no plus, mobile bounds/reduced motion and restoration of the main store.
