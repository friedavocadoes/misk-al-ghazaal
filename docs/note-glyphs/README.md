# Add the new fragrance notes and their glyphs

Source reviewed: `Table/Notes.md`, 6 November 2026. Of the 37 requested names, 36 are new. Slug `apple` already belongs to **Granny Smith Apple**. Its ID, name, definition and glyph stay unchanged. Broader notes such as Fruity, Floral, Woody, Spice and Bakhoor Smoke remain alongside the new specific notes; they are not duplicates of individual ingredients.

## 1. Add the notes

Open `supabase/migration_notes_expansion_20261106.sql`, copy the SQL into **Supabase Dashboard → SQL Editor**, and run it once. It can safely be rerun. It skips an existing matching slug or English name without updating it. No existing product assignments, notes, IDs or uploaded art are deleted. The 36 new rows start enabled with English definitions, Arabic names, curated colours and the current default glyph. Arabic definitions fall back to English until you add translations.

This targets the schema in your supplied table, including `glyph` and `is_active`. If preparing another Supabase project, apply the existing glyph/active migrations there first.

## 2. Generated matching artwork

The requested glyphs have now been generated individually with the built-in image generator. Use `assets/note-glyphs/matched-20261106/`: original transparent PNG masters, a labelled `preview.html` / `preview.png`, and upload-ready lossless WebPs in `webp/`. The actual prompts are recorded in `generation-log.json` there. Existing Apple and the earlier draft images are unchanged.

From the repository root, after applying the notes migration:

```powershell
node scripts/upload-note-glyphs.mjs --dir "assets/note-glyphs/matched-20261106" --apply
```

Then use **Admin → Notes → Refresh storefront**. No remote upload or SQL execution was performed during artwork generation.

### Generating future matching artwork

Open **[prompts.md](prompts.md)**. There are 36 individual, copy-ready prompts, each labelled with its exact output filename. Start with one image, approve its style, then supply it as a style reference for subsequent generations. Generate each icon separately, rather than asking for a sheet of 36: this makes cropping, filenames and consistency easier.

- Use square transparent PNG masters. Match the existing bold charcoal botanical silhouettes, with broad clean negative-space cutouts and restrained detail. Keep the main subject around 72% of the canvas, centred, without words or a background.
- Save each image with the specified slug filename, e.g. `blackcurrant.png`, `lily-of-the-valley.png`, `guaiac-wood.png`. PNG/WebP/AVIF inputs are supported. Keep just one format per slug in a batch.
- Check images on light and dark backgrounds. A visible checkerboard baked into a PNG is not transparency. The tool rejects fully opaque or empty images, but you still need to review drawing quality and unwanted marks.
- Keep masters separately. The tool produces crisp **512×512 lossless WebP with alpha** for the website. It preserves colours and transparent padding; it does not remove backgrounds or repair drawings.

`manifest.json` contains the same filenames, prompts and note metadata in machine-readable form. Apple's entry is marked existing and has no new prompt.

## 3. Preview and convert locally

From the repository folder in PowerShell, after installing project dependencies:

```powershell
node scripts/upload-note-glyphs.mjs --dir "C:\Users\g\Downloads\new-note-glyphs"
```

This default mode **does not contact Supabase**. It validates and converts matching images, creates a `webp` subfolder, and prints intended Storage paths. You can generate/upload in small batches; all 36 files are not required at once. Unknown filenames are listed and ignored. Invalid or duplicate input files stop the batch before any remote upload.

## 4. Upload and link the notes

The existing local `.env` needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` (legacy `SUPABASE_SERVICE_ROLE_KEY` also works). This is an owner-only local utility; never paste secret keys into prompts, put them in browser code, or prefix them with `NEXT_PUBLIC_`. The script does not print credentials or send them to your storefront.

Review the generated WebPs, then run:

```powershell
node scripts/upload-note-glyphs.mjs --dir "C:\Users\g\Downloads\new-note-glyphs" --apply
```

The tool checks that the matching note rows exist first. It uploads WebPs to the existing public **products** bucket under `note-glyphs/bulk-20261106/`, then sets each note's `glyph` to the public URL. Content-hashed filenames allow safe retries without stale cached images. A concurrent admin edit is preserved rather than overwritten.

Existing custom glyphs are skipped by default. To intentionally replace artwork for these new notes:

```powershell
node scripts/upload-note-glyphs.mjs --dir "C:\Users\g\Downloads\new-note-glyphs" --apply --replace
```

Apple is always excluded from this bulk import. Edit its existing note through the admin panel if you ever want to change it.

Each upload run writes an `upload-report-<timestamp>.json` inside `webp`, containing previous/new public URLs and any failures. If interrupted or partially unsuccessful, rerun the command: already-linked identical images are skipped. Previous custom artwork files are retained for rollback. An upload that succeeds before a database error may leave an unreferenced file; it can be reused on retry. Never delete the whole `note-glyphs` folder to clean these up.

## 5. Refresh the website

Open **Admin → Notes → Refresh storefront** after running the SQL and after an upload batch. This authenticated action refreshes the locale-aware storefront caches and the admin library. Check a few notes in the grid, scent finder and a product composition before continuing.

The migration adds library entries only. Assign notes to products using the product editor's top/heart/base selector; no perfume ingredients are inferred automatically.

## Manual alternative

For just one or two images, use **Admin → Notes → search the note → Edit note → Upload artwork → Save note**. This already converts supported images to WebP, uploads to Supabase and refreshes the storefront. Do not merely upload into Storage: the note's `glyph` URL must also be saved. Bulk upload above does both steps for you.

No SQL execution or remote image upload is performed merely by adding these files to the repository. The commands above are the explicit execution steps.
