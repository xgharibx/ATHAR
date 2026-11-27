#!/usr/bin/env node
/**
 * Splits each hadith book (data/hadith/{book}.json, the source) into what the
 * app loads: a table of contents and one file per chapter, so a book opens
 * and a hadith shows without loading the whole book (Bukhari is 8.6 MB).
 * Run last, after tidy-hadith.mjs and hadith-bundle-v2.mjs; safe to run again.
 *
 *   node tools/scripts/hadith-books.mjs
 *
 *   public/data/hadith/books/{book}.json        the book: meta, chapters,
 *       and one row [n, chapter, ref?] per hadith, in order (ref when the
 *       printed number is not simply n; see hadithRefs() in hadithNumbers.ts)
 *   public/data/hadith/books/{book}/{chapter}.json   that chapter's hadiths
 *
 * Chapters are the classical «كتب» of public/data/hadith/sections.json,
 * assigned by number the same way as assignChapters() in hadithChapters.ts.
 * The two forties are one chapter each.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { refsOf } from "./tidy-hadith.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = join(ROOT, "data/hadith");
const PUBLIC = join(ROOT, "public/data/hadith");
const OUT = join(PUBLIC, "books");
const BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"];

export function chapterOf(n, sections) {
  let found = 0;
  let lo = 0;
  let hi = sections.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sections[mid].first <= n) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return sections[found].id;
}

function main() {
  const table = JSON.parse(readFileSync(join(PUBLIC, "sections.json"), "utf8"));
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const key of BOOKS) {
    const pack = JSON.parse(readFileSync(join(SOURCE, `${key}.json`), "utf8"));
    const sections = (table[key] ?? [])
      .map((c) => ({ id: c.id, title: c.t, first: c.f, last: c.l }))
      .sort((a, b) => a.first - b.first);
    const refs = refsOf(pack.hadiths);
    const chapters = new Map();
    const rows = pack.hadiths.map((h, i) => {
      const s = sections.length ? chapterOf(h.n, sections) : h.s;
      const item = { ...h, s, r: refs[i] };
      if (!chapters.has(s)) chapters.set(s, []);
      chapters.get(s).push(item);
      return refs[i] === String(h.n) ? [h.n, s] : [h.n, s, refs[i]];
    });
    const { hadiths: _all, ...meta } = pack;
    writeFileSync(join(OUT, `${key}.json`), JSON.stringify({ ...meta, sections, count: rows.length, rows }), "utf8");
    mkdirSync(join(OUT, key), { recursive: true });
    for (const [s, hadiths] of chapters) writeFileSync(join(OUT, key, `${s}.json`), JSON.stringify({ key, s, hadiths }), "utf8");
    console.log(`${key}: ${rows.length} hadiths in ${chapters.size} files`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
