# Misk Al Ghazaal

Bilingual Next.js storefront and admin workspace backed by Supabase.

## Local development

1. Use Node.js 22 and run `npm ci`.
2. Copy `.env.example` to `.env` and fill in your Supabase credentials. See the [Supabase setup guide](docs/guides/SETUP_SUPABASE.md).
3. Run `npm run dev` and open `http://localhost:3000`. The staff console is at `/admin`.

For a new database, start with the [numbered migration order](supabase/README.md). The demo catalog is optional.

## Checks

```sh
npm run lint
npx tsc --noEmit
node --test tests/*.test.cjs
npm run build
```

The build reads catalog data from the configured Supabase project. Some tests support an optional local PGlite module via `ANALYTICS_PGLITE_MODULE`. The Originales browser suite has its own setup in the [feature guide](src/features/originales/README.md).

## Project map

- `src/app/[locale]/(storefront)/` holds the English and Arabic storefront.
- `src/app/admin/` holds the staff console.
- `src/app/api/` holds the server endpoints.
- `src/lib/` holds shared catalog, pricing and Supabase access code.
- [Guides](docs/guides/) cover operations and integrations. [AGENTS.md](AGENTS.md) records repository conventions and history.
