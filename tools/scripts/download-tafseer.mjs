/**
 * Downloads Tafseer Al-Muyassar (التفسير الميسر) and Tafseer Al-Jalalayn
 * for all 114 surahs from alquran.cloud and saves them as static JSON files
 * in public/data/ so the Quran reader can load them offline.
 *
 * Usage: node tools/scripts/download-tafseer.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../public/data");

// editions to download
const EDITIONS = [
  { id: "ar.muyassar",  outFile: "tafseer-muyassar.json" },
];

const TOTAL_SURAHS = 114;
const DELAY_MS = 120; // polite delay between requests

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSurah(surahNum, edition) {
  const url = `https://api.alquran.cloud/v1/surah/${surahNum}/${edition}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  const ayahs = json?.data?.ayahs;
  if (!Array.isArray(ayahs)) throw new Error(`Unexpected shape for surah ${surahNum}`);
  // Return array indexed by numberInSurah (1-based, index 0 unused)
  const texts = [];
  for (const a of ayahs) {
    texts[a.numberInSurah] = a.text;
  }
  return texts;
}

async function downloadEdition(edition, outFile) {
  console.log(`\n=== Downloading ${edition} ===`);
  const result = {};
  for (let s = 1; s <= TOTAL_SURAHS; s++) {
    process.stdout.write(`  Surah ${s}/${TOTAL_SURAHS}...`);
    let retries = 3;
    while (retries > 0) {
      try {
        result[s] = await fetchSurah(s, edition);
        process.stdout.write(` ✓\n`);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) {
          process.stdout.write(` ✗ (${err.message})\n`);
          result[s] = [];
        } else {
          process.stdout.write(` retry...`);
          await sleep(1000);
        }
      }
    }
    await sleep(DELAY_MS);
  }
  const outPath = path.join(OUT_DIR, outFile);
  fs.writeFileSync(outPath, JSON.stringify(result), "utf-8");
  const size = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`\n✅ Saved ${outFile} (${size} KB)`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error(`Output directory not found: ${OUT_DIR}`);
    process.exit(1);
  }
  for (const { id, outFile } of EDITIONS) {
    await downloadEdition(id, outFile);
  }
  console.log("\n✅ All done!");
}

main().catch((err) => { console.error(err); process.exit(1); });
