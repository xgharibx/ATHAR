#!/usr/bin/env node
/**
 * «القرآن ٢»: fetch the Quran text and metadata from the Tanzil Project.
 *
 *   node tools/scripts/quran2/fetch-tanzil.mjs
 *
 * Writes, under public/data/quran2/:
 *   tanzil-uthmani.txt  the Uthmani text 1.1 exactly as Tanzil serves it, with its
 *                       copyright block (the licence allows verbatim copies only);
 *   tanzil-meta.json    the metadata 1.0 (surahs, juz, hizb quarters, manzils,
 *                       rukus, Madani pages, sajdas) as JSON, with its notice.
 *
 * Both are checked before anything is written: 6236 ayahs in 114 surahs, the
 * ayah counts agreeing with the metadata, 604 pages, 30 juz, 15 sajdas.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import path from "node:path";

const OUT = path.resolve("public/data/quran2");
const TEXT_URL =
  "https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=false&tatweel=true&alef=true&quranType=uthmani&outType=txt-2&agree=true";
const META_URL = "https://tanzil.net/res/text/metadata/quran-data.js";

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "athar-build" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const text = await get(TEXT_URL);
const lines = text.split("\n").filter((l) => /^\d+\|\d+\|/.test(l));
if (lines.length !== 6236) fail(`expected 6236 ayahs, got ${lines.length}`);
if (!text.includes("Tanzil Quran Text (Uthmani, Version 1.1)")) fail("the copyright block is missing or the version changed");

const metaSource = await get(META_URL);
const sandbox = { QuranData: {} };
vm.runInNewContext(metaSource.replace(/^var QuranData = \{\};/m, ""), sandbox, { timeout: 1000 });
const Q = sandbox.QuranData;
// Tanzil closes most lists with a sentinel ([6236, 1] for surahs, [115, 1] for the rest).
const rows = (list) => list.filter((r) => Array.isArray(r) && r.length && r[0] !== 115);
const meta = {
  notice:
    "Quran metadata (ver 1.0), Copyright (C) 2008-2009 Tanzil.info, licensed under Creative Commons Attribution 3.0. Source: https://tanzil.net",
  surahs: rows(Q.Sura).filter((r) => r.length >= 8).map(([start, ayahs, order, rukus, name, tname, ename, type]) => ({
    start, ayahs, order, rukus, name, tname, ename, type: type === "Meccan" ? "meccan" : "medinan",
  })),
  juz: rows(Q.Juz),
  hizbQuarters: rows(Q.HizbQaurter),
  manzils: rows(Q.Manzil),
  rukus: rows(Q.Ruku),
  pages: rows(Q.Page),
  sajdas: rows(Q.Sajda).map(([surah, ayah, type]) => [surah, ayah, type === "obligatory" ? "obligatory" : "recommended"]),
};

if (meta.surahs.length !== 114) fail(`expected 114 surahs, got ${meta.surahs.length}`);
if (meta.pages.length !== 604) fail(`expected 604 pages, got ${meta.pages.length}`);
if (meta.juz.length !== 30) fail(`expected 30 juz, got ${meta.juz.length}`);
if (meta.sajdas.length !== 15) fail(`expected 15 sajdas, got ${meta.sajdas.length}`);
const perSurah = new Map();
for (const l of lines) {
  const s = Number(l.split("|")[0]);
  perSurah.set(s, (perSurah.get(s) ?? 0) + 1);
}
meta.surahs.forEach((s, i) => {
  if (perSurah.get(i + 1) !== s.ayahs) fail(`surah ${i + 1}: text has ${perSurah.get(i + 1)} ayahs, metadata ${s.ayahs}`);
});

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "tanzil-uthmani.txt"), text);
writeFileSync(path.join(OUT, "tanzil-meta.json"), JSON.stringify(meta));
const sha = createHash("sha256").update(text).digest("hex");
console.log(`✓ text: 6236 ayahs, sha256 ${sha}`);
console.log(`✓ metadata: 114 surahs, 604 pages, 30 juz, 15 sajdas`);
