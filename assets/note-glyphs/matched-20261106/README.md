# Matching note glyphs — 6 November 2026

36 individually generated charcoal botanical silhouettes, based on the existing rose and fruity note artwork in `Table/Notes.md`. Apple retains its existing glyph.

- Root PNG files are the original transparent masters.
- `webp/` contains upload-ready 512 × 512 lossless WebP files with alpha.
- `preview.html` shows each glyph at a large size and at 48px on ivory and tinted backgrounds.
- `generation-log.json` records the actual generation prompts and original output paths.
- `validation.json` records alpha checks, sizes and file sizes.

These files are local assets; generating them does not publish them to the storefront.

After running `supabase/migration_notes_expansion_20261106.sql` in Supabase SQL Editor, upload and link the glyphs from the repository root:

```powershell
node scripts/upload-note-glyphs.mjs --dir "assets/note-glyphs/matched-20261106" --apply
```

Then use **Admin → Notes → Refresh storefront**. The importer preserves existing custom artwork by default and always excludes Apple. See `docs/note-glyphs/README.md` for replacements and rollback details.
