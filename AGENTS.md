# Gazaal Migration Memory — Shopify (Ishi theme) → Next.js App Router

> Purpose: long-lived context for all future opencode edits (storefront, Supabase backend, admin panel, orders/notifications). Read this before any code change.

## 1. Source & Target Layout
- Source: `./shopify-theme/` — Ishi-style theme (`layout/theme.liquid`, `templates/*.json`, `sections/*.liquid`, `snippets/*.liquid`, `assets/`, `config/settings_*`).
  - Brand: Gazaal / Misk Al Ghazaal perfumes, Dukhoon/Bakhoor, Holy Oudh. Currency AED. Judge.me reviews, InstaFeed, ETranslate RTL, Booster SEO.
- Target: `./next-storefront/` — fresh Next 16.3.8 + React 19 + TS strict + Tailwind v4 (`src/app/globals.css` uses `@import "tailwindcss"`), path alias `@/* -> ./src/*`. No shadcn, no components, no lib yet. `src/app/` only has `layout.tsx, page.tsx`.
  - Next AGENTS.md rule: this is NOT classic Next — must check `node_modules/next/dist/docs/` before writing code.

## 2. Architectural Rules (user-mandated, never violate)
1. **No Liquid copy-paste.** Extract visual layout → React. Strip `{% %}`, `{{ }}`, `{% schema %}`.
2. `components/ui/*` = centralized Shadcn-standard primitives only (button, input, badge, sheet/drawer, dialog, accordion, tabs, carousel, pagination, toast).
3. `components/blocks/*` = complex structural sections (HeroBanner, ProductCarousel, CartDrawer, etc.). Dedupe redundant markup (e.g. 5x product-card snippets → 1x `ProductCard`).
4. Replace Shopify objects with Supabase-ready TS interfaces in `lib/types.ts`: Product, Variant, Category/Collection, Article, Cart, Order (future), Review. No Shopify logic in UI.
5. `lib/mock-data.ts` populates UI for browser verification before backend exists.
6. Phase 1 = routes + UI scaffolding only. NO backend, admin panel, checkout, auth logic yet. Phase 2 (later) = Supabase + admin + orders/notifications.

## 3. Route Map (Shopify template → Next App Router)
Base: `src/app/(storefront)/layout.tsx` (SiteHeader + CartDrawer + SiteFooter + CookieConsent) + `not-found.tsx`.
- `/` ← `index.json` (Slideshow hero + serviceblock + galleryblock + featured products + newsletter)
- `/product/[slug]` ← `product.json` + `product.miskalgazaal.json` (UNIFY into one page; `miskalgazaal` becomes variant prop, not separate route)
- `/collections` ← `list-collections.json`
- `/collections/[slug]` ← `collection.json` + `collection.holy-odh.json` + `collection.ramadan-bakhoor-sale.json` (all three are same grid + banner; slug drives mock filter)
- `/cart` ← `cart.json` (items + footer + trending upsell)
- `/search` ← `search.json` + `search.json.liquid` (query param `?q=`)
- `/blog` + `/blog/[slug]` ← `blog.json` + `article.json`
- `/about`, `/contact`, `/faq`, `/wishlist`, `/brands`, `/women`, `/new-arrivals`, `/wholesale`, `/terms`, `/sitemap`, `/holy-oudh`, `/ramadan-offer` ← `page.*.json` (all use generic `pages/[slug]` + dedicated SEO-rich components for contact/faq/wishlist where needed)
- `/account/*` (login, register, account, addresses, orders/[id]) ← `templates/customers/*.liquid` — STUB only in Phase 1, no auth.
- System: `not-found.tsx` ← `404.json`+`main-404`; `robots.ts` ← `robots.txt.liquid`; `gift_card`, `password.json` → OUT OF SCOPE.

## 4. Component Inventory (sections/snippets → blocks)
- Chrome: `SiteHeader` (header_layout1/2 + Ishi_megamenu + megamenu snippet + language-currency), `MegaMenu`, `SearchDrawer` (search-form), `CartDrawer` (cart-notification* + cart-icon-bubble), `SiteFooter` (footer + copyright_payment), `NewsletterSection` (newsletter/newsletterblock), `PromoPopup` (newsletterpopup), `CookieConsent` (cookieconsent).
- Home/commerce: `HeroCarousel` (Ishi_slideshow), `CategoryTiles` (Ishi_serviceblock), `CollectionGrid/Card` (Ishi_collection_list + collection-grid-item + parallax-with-category), `ShopByBrands` (Ishi_galleryblock + Ishi_manufactureblock), `ProductTabs + ProductCarousel + ProductCard + PriceDisplay` (Ishi_featured_product_style1/2 + product-tab + product-card-grid* + price + product-thumbnail + menu-productcard), `FeaturedSingleProduct` (Ishi_single_product), `ParallaxCTA`, `StoryBlock`, `Testimonials`, `ReviewsCarousel` (judgeme_* + banner/videowithtestimonial + testimonialwithservice), `BlogCardGrid` (featured-blog-style1/2 + article-card + videowithblog), `InstagramFeed` (instafeed/apps).
- PDP (`main-product` blocks): `ProductGallery`, `ProductInfo` (title/review/price), `VariantPicker`, `QuantitySelector`, `BuyBox` (buy_buttons), `TrustBadges` (reassurance + trusted_image + cart-reassurance), `ProductTabsAccordion` (product-tab: description/shipping/assurance/review).
- PLP: `CollectionBanner` (main-collection-banner), `ProductGrid + Filters/Sort + Pagination` (main-collection-product-grid + Ishi_sidebar + pagination).
- Cart: `CartLineItems` (main-cart-items), `CartSummary` (main-cart-footer + subtotal/buttons).
- Content: `FaqAccordion` (faq-page), `ContactInfo + ContactForm` (contact-banner + contact-form + contact-style1/2), `AboutBanner`, `RichText`, `InstagramFeed`, `WishlistGrid` (page-wishlist + wishlist-product).
- Dedupe rule: `product-card-grid, -style2, -search, -left, -placeholder*` → ONE `ProductCard` with `variant: default|compact|search|list` prop.

## 5. Data Model (Supabase-ready, `lib/types.ts` + `lib/mock-data.ts`)
```ts
Product { id, slug, title, descriptionHtml, price, compareAtPrice?, images[], categorySlugs[], tags[], rating, reviewCount, variants[], featured?, isNew?, isBestSeller? }
Variant { id, title (e.g. 12ml/50ml), price, stock, sku? }
Category { id, slug, title, image, description?, productCount? }
Article { slug, title, excerpt, image, date, author? }
CartItem { productSlug, variantId?, qty }
```
Mock: ~12 Gazaal-realistic products (Misk Al Ghazaal, Noorjes Imagine, Big Boss/Dhukhoon, Jawahara Bakhoor tablets, Holy Oudh), 5 categories (arabic-fragrance, fresh-fragrance, dukhoon/bakhoor, mubakhar, best-sellers/new-arrivals), collections mapping above.

## 6. Phase Plan
- Phase 1 (DONE 2026-10-05, `next build` green, 47 pages): installed shadcn deps (class-variance-authority, clsx, tailwind-merge, lucide-react, radix slot/dialog/accordion/tabs), scaffolded `(storefront)` routes above as thin server components fed by mock-data, built `ui/` + `blocks/` per inventory, `lib/types.ts` + `lib/mock-data.ts`. NOTE: `PageProps<'/route'>` must OMIT the `(storefront)` group prefix; `params`/`searchParams` are Promises (await them). Old `src/app/page.tsx` removed (group page owns `/`).
- Phase 2 (later, DO NOT start): Supabase schema mirroring types, admin panel `app/(admin)/*`, checkout/orders + notifications (email/WhatsApp), auth, Judge.me replacement, RTL.
