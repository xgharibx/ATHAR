# Hadith books (source)

The nine books as one file each, the source of truth for the hadith data.
They are not shipped as they are: `tools/scripts/hadith-books.mjs` splits
each into a small table of contents and one file per chapter
(`public/data/hadith/books/`), so a book opens without loading all of it.

Order of the build scripts, all safe to run again:

1. `node tools/scripts/import-hadith.mjs` (only to re-import from hadith-api)
2. `node tools/scripts/tidy-hadith.mjs`
3. `node tools/scripts/hadith-bundle-v2.mjs`
4. `node tools/scripts/hadith-books.mjs`
