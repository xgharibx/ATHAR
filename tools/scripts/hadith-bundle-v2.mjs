#!/usr/bin/env node
/**
 * Hadith bundle v2. Run after import-hadith.mjs and tidy-hadith.mjs; safe to
 * run again.
 *
 *   node tools/scripts/hadith-bundle-v2.mjs
 *
 * - Each hadith gets its rulings with the scholar who gave them («gr»):
 *   [[grader, "إسناده صحيح"], …], graders numbered as HADITH_GRADERS in
 *   src/data/hadithTypes.ts, rulings put into Arabic word by word from the
 *   source's English (every one of the 1,671 forms in the source).
 * - Writes public/data/hadith/text/{book}.json: the whole text of every
 *   hadith without harakat, one row [n, text, grade, ref?], so search reads
 *   every word of every hadith, not only its opening. Folded the same way
 *   as foldHadithSearch() in src/lib/hadithFullText.ts.
 *
 * The source editions (fawazahmed0/hadith-api, public domain) are read from
 * $HADITH_SRC when it names a folder of ara-{book}.json files, otherwise
 * downloaded and kept in memory.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { refsOf } from "./tidy-hadith.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = join(ROOT, "data/hadith");
const PUBLIC = join(ROOT, "public/data/hadith");
const SRC = process.env.HADITH_SRC || "";
const CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"];

/** Same order as HADITH_GRADERS in src/data/hadithTypes.ts. */
export const GRADERS = [
  "Al-Albani",
  "Zubair Ali Zai",
  "Shuaib Al Arnaut",
  "Abu Ghuddah",
  "Muhammad Muhyi Al-Din Abdul Hamid",
  "Muhammad Fouad Abd al-Baqi",
  "Ahmad Muhammad Shakir",
  "Bashar Awad Maarouf",
  "Salim al-Hilali",
];

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
/** Same as foldHadithSearch() in src/lib/hadithFullText.ts. */
export function fold(text) {
  return text
    .replace(MARKS, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي0-9٠-٩]+/g, " ")
    .trim();
}

// Arabic for the source's ruling strings, composed word by word.
const AR_DIGITS = (s) => s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
export function arabicRuling(raw) {
  let s = raw.trim().replace(/\s+/g, " ");
  if (!s || s === "-") return "";
  const agreed = /Agreed Upon|Bukhari And Muslim/i.test(s);
  s = s.replace(/-?\s*(Agreed Upon|Bukhari And Muslim)/gi, " ").trim();
  // «Sahih Bukhari (1023) Sahih Muslim (894)» and «Sahih Muslim» as a place.
  const refs = [];
  s = s.replace(/Sahih (Bukhari|Muslim)(?: \(([^)]*)\))?/gi, (_, who, inner) => {
    const where = inner
      ? AR_DIGITS(inner.replace(/\s+/g, " ").trim()
          .replace(/Through Last/gi, "إلى آخره").replace(/\bAfter\b/gi, "بعد").replace(/\bMukhtasar\b/gi, "مختصرًا").replace(/,/g, "،"))
      : "";
    refs.push(`${/bukhari/i.test(who) ? "البخاري" : "مسلم"}${where ? ` (${where})` : ""}`);
    return " ";
  }).trim();
  s = s.replace(/^-\s*|\s*-\s*$/g, "").trim();
  s = s.replace(/\s*-\s*/g, " ").replace(/\s*,\s*/g, " , ").trim();
  const words = s.toLowerCase().split(" ").filter(Boolean);
  const W = {
    sahih: "صحيح", hasan: "حسن", daif: "ضعيف", "da'if": "ضعيف", weak: "ضعيف", shadh: "شاذ", munkar: "منكر", mawdu: "موضوع", maudu: "موضوع",
    batil: "باطل", mursal: "مرسل", mutawatir: "متواتر", mauquf: "موقوف", muquf: "موقوف", mawquf: "موقوف", maqtu: "مقطوع",
    lighairihi: "لغيره", lighayrihi: "لغيره", matn: "المتن", hadith: "", jayyid: "جيد", qawi: "قوي", ghareeb: "غريب", gharib: "غريب",
    very: "", witness: "بشاهده", ",": "،", malool: "معلول", "ma'lool": "معلول", muallal: "معلول", mudtarib: "مضطرب", munqati: "منقطع", mudal: "معضل", maqlub: "مقلوب", matruk: "متروك",
  };
  const out = [];
  let isnadPending = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "isnaad" || w === "isnad" || w === "sanad") {
      if (out.length === 0) { isnadPending = true; continue; } // «Isnaad Sahih» → «إسناده صحيح»
      out.push("الإسناد"); continue;                              // «Sahih Isnaad» → «صحيح الإسناد»
    }
    if (w === "very" && words[i + 1] && /da.?if|weak/.test(words[i + 1])) { out.push("ضعيف جدًّا"); i++; continue; }
    if (!(w in W)) return null;
    if (W[w]) out.push(W[w]);
  }
  let text = out.join(" ");
  if (isnadPending) text = `إسناده ${text}`.trim();
  if (agreed) text = text ? `${text}، متفق عليه` : "متفق عليه";
  if (refs.length) text = [text, `رواه ${refs.join(" و")}`].filter(Boolean).join("، ");
  return text.replace(/\s+،/g, "،").replace(/\s+/g, " ").trim();
}

/** The source edition: a local copy when $HADITH_SRC names a folder, else downloaded (kept in memory only). */
async function source(key) {
  if (SRC) return JSON.parse(readFileSync(join(SRC, `ara-${key}.json`), "utf8"));
  const res = await fetch(`${CDN}/ara-${key}.min.json`);
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  mkdirSync(join(PUBLIC, "text"), { recursive: true });
  for (const key of BOOKS) {
    const path = join(DIR, `${key}.json`);
    const pack = JSON.parse(readFileSync(path, "utf8"));
    const src = await source(key);
    const byNumber = new Map(src.hadiths.map((h) => [h.hadithnumber, h]));
    let graded = 0;
    pack.hadiths = pack.hadiths.map((h) => {
      const { gr: _old, ...rest } = h;
      const rulings = [];
      for (const g of byNumber.get(h.n)?.grades ?? []) {
        const who = GRADERS.indexOf(g.name);
        const ruling = arabicRuling(String(g.grade ?? ""));
        if (who < 0) throw new Error(`${key}:${h.n} unknown grader ${g.name}`);
        if (ruling === null) throw new Error(`${key}:${h.n} untranslated ruling ${g.grade}`);
        if (ruling && !rulings.some(([w, r]) => w === who && r === ruling)) rulings.push([who, ruling]);
      }
      if (rulings.length) graded++;
      return rulings.length ? { ...rest, gr: rulings } : rest;
    });
    writeFileSync(path, JSON.stringify(pack), "utf8");

    const refs = refsOf(pack.hadiths);
    const rows = pack.hadiths.map((h, i) => {
      const row = [h.n, fold(h.t), h.g[0] ?? ""];
      if (refs[i] !== String(h.n)) row.push(refs[i]);
      return row;
    });
    writeFileSync(join(PUBLIC, "text", `${key}.json`), JSON.stringify({ key, v: 2, rows }), "utf8");
    console.log(`${key}: ${graded} of ${pack.hadiths.length} with named rulings`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
