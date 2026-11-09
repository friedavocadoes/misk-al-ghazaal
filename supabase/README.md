# Supabase migration order

Use this order on a **new Supabase project** before creating users or connecting the storefront. The existing SQL filenames are stable and remain the upgrade history for deployed projects. The numbered order lives in [bootstrap-order.json](bootstrap-order.json), which separates schema upgrades from imports that target specific live products.

## New project

1. Print the numbered SQL Editor checklist from the repository root.

   ```sh
   node scripts/build-supabase-bootstrap.mjs --list
   ```

   Add `--with-demo` if you want the legacy sample catalog. That places `seed.sql` immediately after `schema.sql`, so later migrations can backfill the sample rows.
2. Run each listed file in Supabase **SQL Editor** in that order. Paste each complete file and clear any selection before running it. Stop and resolve the first error before moving on.
3. Set your app credentials, configure Auth redirects, and create the first staff account using the [Supabase setup guide](../docs/guides/SETUP_SUPABASE.md).
4. Import your real catalog and upload your own media. Verify the storefront, admin login, and test checkout in the new project before going live.

For a project you manage with `psql`, generate one ordered file and run it against the new project's database connection.

```sh
node scripts/build-supabase-bootstrap.mjs --output bootstrap.sql
psql --set ON_ERROR_STOP=1 --file bootstrap.sql
```

Configure the connection in your shell or PostgreSQL service settings before running `psql`. Add `--with-demo` on generation if needed. The generator only writes local SQL and refuses to overwrite an existing output file. Some source files manage their own transactions. Run the output without wrapping it in a separate transaction.

## Existing project

Apply only pending migrations in checklist order, with a database backup and a staging run first. Use your deployment records to tell which files have already run. Notification Control replaces the original WhatsApp order trigger function so placement records consent and customer messages start with staff updates. Replaying WhatsApp on its own would restore the older behavior.

- `schema.sql` and `seed.sql` are for fresh projects. The demo seed replaces variant, collection-link, and banner data.
- [Catalog perfume notes](migration_catalog_perfume_notes_20261109.sql) is a separate data import. Run it only after the required product slugs exist and the notes expansion is applied.
- [Reset scripts](resets/README.md) are manual data maintenance and are excluded from setup.

When adding SQL, keep historical files in place and append the new file to the appropriate list in the manifest. Verify the fresh-project order with and without demo data whenever dependencies change.
