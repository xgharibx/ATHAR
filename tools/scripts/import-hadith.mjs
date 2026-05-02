#!/usr/bin/env node
/**
 * Hadith Import Script — Phase 1
 * Downloads all Arabic hadith editions from jsDelivr CDN (fawazahmed0/hadith-api)
 * and saves compact JSON packs to public/data/hadith/
 *
 * Usage:
 *   node tools/scripts/import-hadith.mjs           — import all 9 books
 *   node tools/scripts/import-hadith.mjs bukhari   — import one book
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../../public/data/hadith");

const CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const FALLBACK = "https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions";

/** All 9 books — Kutub al-Sittah + extras */
const BOOKS = [
  {
    key: "bukhari",
    edition: "ara-bukhari",
    title: "صحيح البخاري",
    titleEn: "Sahih al-Bukhari",
    color: "#10b981",
    order: 1,
    grade: "sahih",
    description: "أصح كتاب في السنة النبوية، جمع الإمام محمد بن إسماعيل البخاري",
  },
  {
    key: "muslim",
    edition: "ara-muslim",
    title: "صحيح مسلم",
    titleEn: "Sahih Muslim",
    color: "#3b82f6",
    order: 2,
    grade: "sahih",
    description: "ثاني أصح كتاب في السنة النبوية، جمع الإمام مسلم بن الحجاج",
  },
  {
    key: "abudawud",
    edition: "ara-abudawud",
    title: "سنن أبي داود",
    titleEn: "Sunan Abu Dawud",
    color: "#8b5cf6",
    order: 3,
    grade: "mixed",
    description: "من أمهات كتب السنة، للإمام أبي داود السجستاني",
  },
  {
    key: "tirmidhi",
    edition: "ara-tirmidhi",
    title: "جامع الترمذي",
    titleEn: "Jami at-Tirmidhi",
    color: "#f59e0b",
    order: 4,
    grade: "mixed",
    description: "للإمام محمد بن عيسى الترمذي، مع بيان درجة كل حديث",
  },
  {
    key: "nasai",
    edition: "ara-nasai",
    title: "سنن النسائي",
    titleEn: "Sunan an-Nasai",
    color: "#ef4444",
    order: 5,
    grade: "mixed",
    description: "للإمام أحمد بن شعيب النسائي، من الكتب الستة المعتمدة",
  },
  {
    key: "ibnmajah",
    edition: "ara-ibnmajah",
    title: "سنن ابن ماجه",
    titleEn: "Sunan Ibn Majah",
    color: "#ec4899",
    order: 6,
    grade: "mixed",
    description: "للإمام محمد بن يزيد القزويني ابن ماجه، تمام الكتب الستة",
  },
  {
    key: "malik",
    edition: "ara-malik",
    title: "موطأ مالك",
    titleEn: "Muwatta Malik",
    color: "#06b6d4",
    order: 7,
    grade: "sahih",
    description: "للإمام مالك بن أنس، أقدم كتاب في السنة النبوية الموثّق",
  },
  {
    key: "nawawi",
    edition: "ara-nawawi",
    title: "الأربعون النووية",
    titleEn: "40 Hadith Nawawi",
    color: "#84cc16",
    order: 8,
    grade: "sahih",
    description: "جمع الإمام النووي رحمه الله أجمع أحاديث الإسلام في أربعين حديثاً",
  },
  {
    key: "qudsi",
    edition: "ara-qudsi",
    title: "الأربعون القدسية",
    titleEn: "40 Hadith Qudsi",
    color: "#f97316",
    order: 9,
    grade: "sahih",
    description: "أحاديث قدسية مختارة، كلام الله عز وجل يرويه النبي ﷺ بأسلوبه",
  },
];

/** Fetch with CDN fallback and retry */
async function fetchJSON(edition) {
  const urls = [`${CDN}/${edition}.json`, `${FALLBACK}/${edition}.json`];
  for (const url of urls) {
    try {
      console.log(`  → ${url}`);
      const res = await fetch(url, {
        signal: AbortSignal.timeout(120_000),
        headers: { "Accept-Encoding": "gzip, deflate" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`  ⚠ Failed (${err.message}), trying next URL...`);
    }
  }
  throw new Error(`All URLs failed for ${edition}`);
}

/** Determine which section a hadith belongs to */
function getSectionId(hadithnumber, sectionDetail) {
  for (const [sid, detail] of Object.entries(sectionDetail)) {
    const first = detail.hadithnumber_first ?? detail.arabicnumber_first ?? 0;
    const last = detail.hadithnumber_last ?? detail.arabicnumber_last ?? 999_999;
    if (hadithnumber >= first && hadithnumber <= last) return parseInt(sid, 10);
  }
  return 1; // fallback
}

/** Normalize grade text from API to our schema */
function normalizeGrade(g) {
  if (!g) return null;
  const s = String(g).toLowerCase().trim();
  if (s.includes("sahih") || s.includes("صحيح")) return "sahih";
  if (s.includes("hasan") || s.includes("حسن")) return "hasan";
  if (s.includes("daif") || s.includes("da'if") || s.includes("ضعيف")) return "daif";
  if (s.includes("maudu") || s.includes("موضوع")) return "maudu";
  return s.slice(0, 20); // keep raw if unknown
}

async function importBook(book) {
  console.log(`\n📥 [${book.order}/9] ${book.titleEn}`);

  const raw = await fetchJSON(book.edition);
  const { metadata, hadiths: rawHadiths } = raw;
  const sectionDetail = metadata?.section_detail ?? {};
  const sectionNames = metadata?.section ?? {};

  // Build sections array, sorted by id
  const sections = Object.entries(sectionNames)
    .map(([id, title]) => {
      const sid = parseInt(id, 10);
      const d = sectionDetail[id] ?? {};
      return {
        id: sid,
        title: String(title),
        first: d.hadithnumber_first ?? d.arabicnumber_first ?? 0,
        last: d.hadithnumber_last ?? d.arabicnumber_last ?? 0,
      };
    })
    .sort((a, b) => a.id - b.id);

  // Compact hadiths: use short keys to minimize file size
  const hadiths = (rawHadiths ?? []).map((h) => {
    const grades = (h.grades ?? [])
      .map((g) => (typeof g === "string" ? normalizeGrade(g) : normalizeGrade(g?.grade)))
      .filter(Boolean);
    return {
      n: h.hadithnumber,
      a: h.arabicnumber ?? h.hadithnumber,
      s: getSectionId(h.hadithnumber, sectionDetail),
      t: (h.text ?? "").trim(),
      g: grades,
    };
  });

  const pack = {
    key: book.key,
    title: book.title,
    titleEn: book.titleEn,
    color: book.color,
    order: book.order,
    grade: book.grade,
    description: book.description,
    count: hadiths.length,
    sections,
    hadiths,
  };

  const outPath = join(OUT_DIR, `${book.key}.json`);
  writeFileSync(outPath, JSON.stringify(pack), "utf8"); // minified — no spaces
  const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(pack)) / 1024);
  console.log(`  ✅ ${hadiths.length} hadiths | ${sections.length} sections | ${sizeKB} KB → ${book.key}.json`);

  return {
    key: book.key,
    title: book.title,
    titleEn: book.titleEn,
    color: book.color,
    order: book.order,
    grade: book.grade,
    description: book.description,
    count: hadiths.length,
    sectionCount: sections.length,
  };
}

async function main() {
  const filterKey = process.argv[2]?.toLowerCase();
  const toImport = filterKey ? BOOKS.filter((b) => b.key === filterKey) : BOOKS;

  if (toImport.length === 0) {
    console.error(`❌ Unknown book key: "${filterKey}"`);
    console.error(`   Valid keys: ${BOOKS.map((b) => b.key).join(", ")}`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\n🕌 ATHAR Hadith Import — importing ${toImport.length} book(s) to ${OUT_DIR}\n`);

  const imported = [];
  for (const book of toImport) {
    try {
      const meta = await importBook(book);
      imported.push(meta);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
  }

  // Merge with existing index.json (supports partial re-imports)
  const indexPath = join(OUT_DIR, "index.json");
  let existing = [];
  if (existsSync(indexPath)) {
    try { existing = JSON.parse(readFileSync(indexPath, "utf8")); } catch { /* ignore */ }
  }
  const importedKeys = new Set(imported.map((b) => b.key));
  const merged = [...existing.filter((b) => !importedKeys.has(b.key)), ...imported]
    .sort((a, b) => a.order - b.order);
  writeFileSync(indexPath, JSON.stringify(merged, null, 2), "utf8");

  const totalHadiths = merged.reduce((s, b) => s + (b.count ?? 0), 0);
  console.log(`\n📚 Index: ${merged.length} books | ${totalHadiths.toLocaleString()} total hadiths`);
  console.log("✨ Done!\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
