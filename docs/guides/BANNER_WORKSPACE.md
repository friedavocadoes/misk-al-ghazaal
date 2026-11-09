# Banner workspace

## Install before deploying

Run `supabase/migration_banner_workspace.sql` in Supabase SQL Editor after the existing navigation-banner, soft-delete and device-artwork migrations. It adds `banners.is_active` (existing banners default to enabled), normalizes non-binned order numbers independently per placement, creates an index, filters disabled/binned banners from public reads and installs the authorized reorder RPC. The agent has not applied this migration to the live database.

The storefront deliberately filters `is_active=true` in its database query. Apply the migration before deploying this code; do not work around a missing column by fetching disabled records and filtering them in JavaScript.

## Everyday use

- `/admin/banners` opens Homepage hero. Brand cards and Shop menu have their own tabs, URLs and lists. Searches apply within the selected placement. Add banner is scoped to that placement.
- Drag a row by its handle, including on touch screens. Up/down buttons provide the same operation with keyboard or touch. Order numbers automatically become 1…N in that placement, including disabled rows. Clearing search is required before reordering so unseen rows cannot be lost.
- Enable/Disable is separate from deleting. Disabled rows remain editable, turn gray and retain their artwork/order. Public queries and RLS exclude them. The menu uses only the first two enabled banners, limited in the database.
- Add banner separates artwork from copy/visibility. New banners append to the selected placement. Images convert to WebP before Storage upload. Hero banners support optimized video; Brand and Menu support images. Menu banners can copy a hero image to an independent Storage object.
- Upload source progress is measured. Video optimization/poster generation shows an indeterminate processing stage, followed by saving. Closing the dialog and creating another asset are blocked while preparation is in progress. Publishing stays disabled until desktop artwork and any requested mobile artwork are ready. Failed uploads preserve the form and previous live media.
- In the editor, artwork uploads save automatically. Main media and its poster update in one database write. Copy/layout use the existing dirty-aware AdminForm Save button. Saving copy cannot overwrite an independently changed order, media or enabled state. Arabic fields, image positioning and existing-media URLs are available under expandable sections.
- Turning separate mobile artwork off atomically clears both mobile references and checks old artwork for cleanup. Simply enabling the option leaves shared artwork live until a mobile upload is saved. Image-only placements do not offer mobile video.
- Hero/Brand deletion retains recycle-bin behavior. Menu deletion remains permanent and attempts to purge unreferenced artwork. Shared references, including binned banners and homepage sections, are retained. Storage cleanup failure does not undo a successful database save/delete; failures are logged for follow-up.

## Media and storefront performance

| Placement | Desktop image | Mobile image | Format |
|---|---|---|---|
| Homepage hero | 1920 × 1080 | 900 × 1600 | WebP; optimized H.264 MP4 for video |
| Brand cards | 1200 × 1500 | Same crop, or separate 4:5 artwork | WebP |
| Shop menu | 800 × 1000 | Same crop, or separate 4:5 artwork | WebP |

Video processing retains the existing first-20-seconds, silent, CRF18, 30fps, faststart H.264 output with a WebP poster. Desktop is bounded to 1920 × 1080; mobile now uses portrait bounds up to 1080 × 1920 without upscaling. Upload source limits remain 3 MB/image and 30 MB/video. Hosting request/time limits can be lower; the UI displays server/upload failures rather than reporting false success.

`store.ts` queries only the requested active placement with explicit columns. Navigation is capped at two enabled rows. Homepage brand rows are not queried when configured homepage sections do not use `brand_split`. Disabling a placement in the registry also skips its storefront query.

Both desktop/mobile **URL strings** can be included in the server-rendered banner metadata; this does not download the files. `HeroSlider` and `DeviceBannerImage` select the matching viewport before mounting a separate asset, so the other viewport's image/video is not requested. Shared artwork is intentionally used on either viewport when no mobile override exists. `SafeImage` now follows source changes immediately and scopes fallback state to the failed source, fixing stale media after resizing. Fit and focal settings apply to hero/image/video surfaces.

If every hero is disabled, no hero or homepage arrival overlay renders. HeroSlider emits an empty-hero marker/event so SiteHeader uses its normal solid surface and content spacing on the homepage; it does not leave white navigation text floating over the first content section.

## Architecture and future placement removal

- `src/lib/banner-config.ts`: placement labels, dimensions, video allowance and `enabled` flags. Set `brand.enabled=false` or `navigation.enabled=false` to remove that admin tab and skip the placement's storefront queries without deleting its data. Existing detail records remain recoverable; removing data entirely is a separate deliberate operation. These code flags require deployment; individual banner enable/disable changes only require the normal cache invalidation/page refresh.
- `src/app/admin/banners/actions.ts`: authorization, copy/media/visibility, reorder, create/delete, audit and revalidation. All entry points re-check super-admin role.
- `supabase/migration_banner_workspace.sql`: complete-placement reorder under a short write lock; rejects missing/duplicate/foreign IDs and a stale expected order. Concurrent changes produce a refresh-and-retry error instead of silent partial writes. Browser roles cannot bypass the super-admin check in the RPC.
- `banner-workspace.tsx`: optimistic ordering/visibility with rollback, pending states and keyboard controls; existing Motion dependency, no new package.
- `banner-editor.tsx`, `banner-create-button.tsx`, `banner-copy-fields.tsx`, `banner-media-upload.tsx`: scoped forms/media UI. Old BannerImageField/MobileBannerField implementations were removed to avoid maintaining competing save flows.
- `hero-video-uploader.tsx`: measured XMLHttpRequest upload phase, processing/saving stages, timeout/error handling and unmount cancellation. `/api/admin/hero-video` performs conversion/upload, never client-side video playback as a substitute for optimization.
- Storefront invalidation uses `revalidateHome`/`revalidateNavigation` helpers for public, `/en` and `/ar` rewrites; admin list/detail routes are also invalidated.

## Verification

`tests/banner-workspace.test.cjs` checks enabled-placement database queries, retiring a placement without a query, responsive fallback state, server authorization and independent copy saves. Disposable PostgreSQL tests execute the migration twice and verify public RLS, disabled/banner-bin exclusion, authorization, complete ordering, stale-order rejection and isolation between placements.

Browser QA uses actual admin components with mocked uploads/actions and no live writes. Checks cover desktop/mobile layout, drag and arrow ordering, disabled gray state, search guard, video progress/close protection, separate-mobile requirement and creation. Actual HeroSlider/DeviceBannerImage network checks verify matching-viewport downloads. These checks do not send customer messages, upload real media or change production banners.
