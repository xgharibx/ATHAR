/**
 * Writes android/app/src/main/assets/car_catalog.json: what Android Auto
 * shows from Athar — the Quran radio stations, the reciters and the 114
 * surahs with their verse counts — from the app's own lists, so the car and
 * the app always agree. tests/androidAuto.test.ts fails if they drift apart.
 *
 *   node tools/scripts/generate-car-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { plainSurahName } from "./generate-ios-surahs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function buildCatalog() {
  const reciterSource = fs.readFileSync(path.join(root, "src/lib/quranReciters.ts"), "utf8");
  const reciters = [...reciterSource.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*category:\s*"(\w+)"(?:,\s*sub:\s*"([^"]+)")?/g)]
    .map((m) => ({ id: m[1], label: m[4] ? `${m[2]} — ${m[4]}` : m[2] }));
  const radioSource = fs.readFileSync(path.join(root, "src/lib/radioPlayer.ts"), "utf8");
  const block = radioSource.slice(radioSource.indexOf("QURAN_RADIO_STATIONS"), radioSource.indexOf("];"));
  const radios = [...block.matchAll(/\{\s*label:\s*"([^"]+)",\s*url:\s*"([^"]+)"\s*\}/g)].map((m) => ({ label: m[1], url: m[2] }));
  const quran = JSON.parse(fs.readFileSync(path.join(root, "public/data/quran.json"), "utf8"));
  const surahs = quran.surahs.map((surah) => ({ name: plainSurahName(surah.name), ayahs: surah.ayahs.length }));
  if (!reciters.length || !radios.length || surahs.length !== 114) throw new Error("incomplete catalog");
  return { version: 1, reciters, radios, surahs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.join(root, "android/app/src/main/assets/car_catalog.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(buildCatalog(), null, 1) + "\n");
  console.log("wrote", path.relative(root, out));
}
