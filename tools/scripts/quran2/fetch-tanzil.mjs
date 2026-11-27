#!/usr/bin/env node
/**
 * «القرآن ٢»: fetch the Quran text and metadata from the Tanzil Project.
 *
 *   curl -o <dir>/quran-uthmani.txt "<TEXT_URL below>"
 *   curl -o <dir>/quran-data.js "<META_URL below>"
 *   node tools/scripts/quran2/fetch-tanzil.mjs <dir>
 *
 * The script reads the two downloaded files (it fetches nothing itself, so
 * nothing from the network is written unchecked) and writes only after the
 * checks below pass.
 *
 * Writes, under public/data/quran2/:
 *   tanzil-uthmani.txt  the Uthmani text 1.1 exactly as Tanzil serves it, with its
 *                       copyright block (the licence allows verbatim copies only);
 *   tanzil-meta.json    the metadata 1.0 (surahs, juz, hizb quarters, manzils,
 *                       rukus, Madani pages, sajdas) as JSON, with its notice.
 *
 * Both are checked before anything is written: the text must be byte for byte
 * the verified Uthmani 1.1 (its SHA-256 is pinned below), with 6236 ayahs in 114
 * surahs agreeing with the metadata, 604 pages, 30 juz and 15 sajdas. If Tanzil
 * publishes a correction, review it, then update TEXT_SHA256 on purpose.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import path from "node:path";

const OUT = path.resolve("public/data/quran2");
const TEXT_URL =
  "https://tanzil.net/pub/download/index.php?marks=true&sajdah=true&rub=false&tatweel=true&alef=true&quranType=uthmani&outType=txt-2&agree=true";
const META_URL = "https://tanzil.net/res/text/metadata/quran-data.js";
/** The Tanzil Uthmani 1.1 text as verified and bundled (tests/quran2Data.test.ts checks the same file). */
const TEXT_SHA256 = "7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326";

const SRC = process.argv[2];
if (!SRC) {
  console.error(`usage: node tools/scripts/quran2/fetch-tanzil.mjs <dir>\n  with <dir>/quran-uthmani.txt from ${TEXT_URL}\n  and <dir>/quran-data.js from ${META_URL}`);
  process.exit(1);
}

/** One of the downloaded Tanzil files. */
function local(name) {
  return readFileSync(path.join(SRC, name), "utf8");
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const text = local("quran-uthmani.txt");
const textSha = createHash("sha256").update(text).digest("hex");
if (textSha !== TEXT_SHA256) fail(`the text is not the verified Uthmani 1.1 (sha256 ${textSha}); review the change before updating TEXT_SHA256`);
const lines = text.split("\n").filter((l) => /^\d+\|\d+\|/.test(l));
if (lines.length !== 6236) fail(`expected 6236 ayahs, got ${lines.length}`);
if (!text.includes("Tanzil Quran Text (Uthmani, Version 1.1)")) fail("the copyright block is missing or the version changed");

const metaSource = local("quran-data.js");
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
console.log(`✓ text: 6236 ayahs, sha256 ${textSha} (the verified version)`);
console.log(`✓ metadata: 114 surahs, 604 pages, 30 juz, 15 sajdas`);
