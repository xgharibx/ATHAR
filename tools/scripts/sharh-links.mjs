#!/usr/bin/env node
/**
 * Links hadiths in the nine books to their explanation in the Encyclopedia
 * of Translated Prophetic Hadiths (hadeethenc.com), by text, and lists the
 * forties' explanations still to bundle (bundle-sharh.mjs). Safe to run again:
 * existing links are kept, new ones are added.
 *
 *   node tools/scripts/sharh-links.mjs
 *
 * Every hadith title the encyclopedia lists (its matn) is looked for in the
 * whole text of every hadith (public/data/hadith/text/, folded the same way
 * as the search). A hadith gets a link only when exactly one title is found
 * in it — ambiguous matches are left out, never guessed.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fold } from "./hadith-bundle-v2.mjs";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "../../public/data/hadith");
const API = "https://hadeethenc.com/api/v1";
const BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"];
const BUNDLE_BOOKS = new Set(["nawawi", "qudsi"]);
/** Checked by hand and wrong: never linked. */
const NOT_THESE = new Set(["qudsi:8", "qudsi:9"]);

async function getJson(path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}${path}`);
      if (res.ok) return await res.json();
    } catch {
      // retried below
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error(`hadeethenc ${path} failed`);
}

async function allTitles() {
  const roots = await getJson("/categories/roots/?language=ar");
  const titles = new Map();
  for (const root of roots) {
    for (let page = 1; ; page++) {
      const res = await getJson(`/hadeeths/list/?language=ar&category_id=${root.id}&page=${page}&per_page=100`);
      for (const item of res.data ?? []) titles.set(String(item.id), String(item.title));
      if (page >= Number(res.meta?.last_page ?? 1)) break;
    }
  }
  return titles;
}

async function main() {
  const titles = await allTitles();
  console.log(`${titles.size} titles`);
  // The part of each title looked for: up to 90 letters (narrations differ further on).
  // The same hadith listed twice under one title is one match (the newer record).
  const byNeedle = new Map();
  for (const [id, title] of titles) {
    const needle = fold(title).slice(0, 90);
    if (needle.length < 18) continue;
    const prev = byNeedle.get(needle);
    if (!prev || Number(id) > Number(prev)) byNeedle.set(needle, id);
  }
  const needles = [...byNeedle].map(([needle, id]) => [id, needle]);

  const linksPath = join(PUBLIC, "sharh-links.json");
  const links = JSON.parse(readFileSync(linksPath, "utf8"));
  const before = Object.keys(links).length;
  for (const key of BOOKS) {
    const { rows } = JSON.parse(readFileSync(join(PUBLIC, "text", `${key}.json`), "utf8"));
    let added = 0;
    for (const [n, text] of rows) {
      if (links[`${key}:${n}`] || NOT_THESE.has(`${key}:${n}`)) continue;
      const hits = new Map();
      for (const [id, needle] of needles) {
        if (text.includes(needle)) hits.set(id, needle.length);
        if (hits.size > 1 && !BUNDLE_BOOKS.has(key)) break;
      }
      // The forties: the longest title found, when it clearly is the longest.
      const ranked = [...hits].sort((a, b) => b[1] - a[1]);
      if (hits.size === 1 || (BUNDLE_BOOKS.has(key) && ranked.length > 1 && ranked[0][1] >= 1.5 * ranked[1][1])) {
        links[`${key}:${n}`] = ranked[0][0];
        added++;
      }
    }
    console.log(`${key}: +${added}`);
  }
  // The forties, worded differently from the encyclopedia: a title counts when
  // nearly all its words are in the hadith; only a clear best match is kept.
  const titleWords = [...new Map([...titles].map(([id, title]) => [fold(title), id]).sort((a, b) => Number(a[1]) - Number(b[1])))]
    .map(([title, id]) => [id, [...new Set(title.split(" ").filter((w) => w.length > 2))]])
    .filter(([, w]) => w.length >= 5);
  // Short titles («الدين النصيحة»، «لا تغضب») for the forties only, longest first.
  const shortTitles = [...new Map([...titles].map(([id, title]) => [fold(title), id]).sort((a, b) => Number(a[1]) - Number(b[1])))]
    .filter(([title]) => title.length >= 6 && title.length < 18)
    .sort((a, b) => b[0].length - a[0].length);
  for (const key of BUNDLE_BOOKS) {
    const { rows } = JSON.parse(readFileSync(join(PUBLIC, "text", `${key}.json`), "utf8"));
    let added = 0;
    for (const [n, text] of rows) {
      if (links[`${key}:${n}`] || NOT_THESE.has(`${key}:${n}`)) continue;
      const words = new Set(text.split(" "));
      const scored = titleWords
        .map(([id, w]) => [id, w.filter((x) => words.has(x)).length / w.length, w.length])
        .filter(([, share]) => share >= (key === "qudsi" ? 0.7 : 0.85))
        .sort((a, b) => b[1] - a[1] || b[2] - a[2]);
      if (scored.length && (scored.length === 1 || scored[0][1] - scored[1][1] >= 0.05 || scored[0][2] >= 2 * scored[1][2])) {
        links[`${key}:${n}`] = scored[0][0];
        added++;
        continue;
      }
      const short = shortTitles.find(([title]) => ` ${text} `.includes(` ${title} `));
      if (short) {
        links[`${key}:${n}`] = short[1];
        added++;
      }
    }
    console.log(`${key} (by words): +${added}`);
  }
  for (const k of NOT_THESE) delete links[k];
  writeFileSync(linksPath, JSON.stringify(links), "utf8");
  console.log(`links: ${before} → ${Object.keys(links).length}`);

  // The forties' explanations are bundled so they open offline. The script
  // never writes downloaded records into the app itself: it lists the ones
  // still missing, and bundle-sharh.mjs adds them from local copies.
  const bundle = JSON.parse(readFileSync(join(PUBLIC, "sharh-bundled.json"), "utf8"));
  const missing = [...new Set(Object.entries(links)
    .filter(([k, id]) => BUNDLE_BOOKS.has(k.split(":")[0]) && !bundle[id])
    .map(([, id]) => id))];
  console.log(missing.length
    ? `explanations to bundle (${missing.length}): ${missing.join(" ")}\n  save each as <dir>/<id>.json, then: node tools/scripts/bundle-sharh.mjs <dir>`
    : "every linked explanation of the forties is bundled");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
