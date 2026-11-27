#!/usr/bin/env node
/**
 * Adds explanation records to public/data/hadith/sharh-bundled.json from
 * local copies, so they open offline:
 *
 *   node tools/scripts/bundle-sharh.mjs <dir>
 *
 * <dir> holds one file per record, named <id>.json, as the encyclopedia's
 * API returns it (hadeethenc.com/api/v1/hadeeths/one/?language=ar&id=<id>);
 * sharh-links.mjs lists the ids still missing. Each record is checked and
 * reduced to the fields the app shows (explanationRecord) before it is kept.
 */
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const BUNDLE = join(dirname(fileURLToPath(import.meta.url)), "../../public/data/hadith/sharh-bundled.json");

const text = (value, max) => (typeof value === "string" ? value.replace(/[<>]/g, "").slice(0, max) : "");

/**
 * Only the fields the app shows, each checked and bounded (plain text, no
 * markup), so nothing else the API returns ends up in the shipped file. The
 * app validates the same shape again when it reads it (parseSharhHadith).
 */
export function explanationRecord(h, id) {
  if (!h || typeof h !== "object" || String(h.id) !== String(id) || !/^\d{1,7}$/.test(String(id))) return null;
  const record = {
    id: String(id),
    title: text(h.title, 400),
    hadeeth: text(h.hadeeth, 8000),
    attribution: text(h.attribution, 400),
    grade: text(h.grade, 200),
    explanation: text(h.explanation, 20000),
  };
  if (!record.hadeeth || !record.explanation) return null;
  const hints = Array.isArray(h.hints) ? h.hints.map((x) => text(x, 1000)).filter(Boolean).slice(0, 40) : [];
  const words = Array.isArray(h.words_meanings)
    ? h.words_meanings
      .map((w) => ({ word: text(w?.word, 100), meaning: text(w?.meaning, 600) }))
      .filter((w) => w.word && w.meaning)
      .slice(0, 60)
    : [];
  const reference = text(h.reference, 4000);
  return { ...record, ...(hints.length ? { hints } : {}), ...(words.length ? { words_meanings: words } : {}), ...(reference ? { reference } : {}) };
}

function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: node tools/scripts/bundle-sharh.mjs <dir>");
  const bundle = JSON.parse(readFileSync(BUNDLE, "utf8"));
  let added = 0;
  for (const file of readdirSync(dir)) {
    const id = /^(\d{1,7})\.json$/.exec(file)?.[1];
    if (!id || bundle[id]) continue;
    const record = explanationRecord(JSON.parse(readFileSync(join(dir, file), "utf8")), id);
    if (!record) {
      console.warn(`skipped ${file}: not a well-formed explanation`);
      continue;
    }
    bundle[id] = record;
    added++;
  }
  writeFileSync(BUNDLE, JSON.stringify(bundle), "utf8");
  console.log(`bundled explanations: +${added} (${Object.keys(bundle).length})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
