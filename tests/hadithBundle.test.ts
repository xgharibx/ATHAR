import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { findByPrintedNumber, hadithPlaceLabel, hadithRefLabel, hadithRefs, normalizeHadithPack } from "@/data/hadithNumbers";
import { HADITH_BOOKS_STATIC, HADITH_GRADE_LABELS, hadithGradeLabel, type HadithPack } from "@/data/hadithTypes";
import { tidyHadithMarkup, cleanHadithText } from "@/lib/hadithText";
import { cleanVerdict } from "@/lib/dorarTakhrij";
import { findArabicMatches, highlightWindow } from "@/lib/arabicHighlight";
import { hadithAppLink } from "@/lib/companionEvidence";
import { ISLAMIC_LIBRARY_DB } from "@/data/librarySeed";
import { SPOTLIGHT_SECTIONS } from "@/lib/spotlight";

const read = (path: string) => fs.readFileSync(path, "utf8");
const BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"];
const pack = (key: string) => JSON.parse(read(`public/data/hadith/${key}.json`)) as HadithPack;
const index = JSON.parse(read("public/data/hadith/index.json")) as { key: string; count: number; description: string }[];
/** Every book's search text: rows [n, text without harakat, grade, ref?]. */
const text = (key: string) => (JSON.parse(read(`public/data/hadith/text/${key}.json`)) as { key: string; rows: [number, string, string, string?][] }).rows;

describe("The hadith bundle", () => {
  it("has no empty numbering placeholders, and its counts agree everywhere", () => {
    for (const key of BOOKS) {
      const p = pack(key);
      expect(p.hadiths.every((h) => h.t.trim()), key).toBe(true);
      expect(p.count, key).toBe(p.hadiths.length);
      expect(index.find((b) => b.key === key)?.count, key).toBe(p.count);
      expect(HADITH_BOOKS_STATIC.find((b) => b.key === key)?.count, key).toBe(p.count);
    }
    for (const key of BOOKS) expect(text(key).length, key).toBe(pack(key).count);
    expect(fs.existsSync("public/data/hadith/search-index.json")).toBe(false);
  });

  it("carries no web markup, and the forties are titled", () => {
    for (const key of BOOKS) for (const h of pack(key).hadiths) expect(h.t.includes("<"), `${key}:${h.n}`).toBe(false);
    for (const key of ["nawawi", "qudsi"]) {
      const p = pack(key);
      expect(p.hadiths.every((h) => (h.ti ?? "").length > 3)).toBe(true);
      expect(new Set(p.hadiths.map((h) => h.ti)).size).toBe(p.hadiths.length);
    }
    expect(pack("nawawi").hadiths[0]!.ti).toBe("إنما الأعمال بالنيات");
    // The bracketed repeat «[رَوَاهُ الْبُخَارِيُّ]، [وَمُسْلِمٌ]» is gone.
    expect(pack("nawawi").hadiths.some((h) => /\[رَوَاهُ/.test(h.t))).toBe(false);
  });

  it("describes the Muwatta accurately", () => {
    const want = "أقدم ما وصلنا من كتب السنة المصنَّفة، للإمام مالك بن أنس";
    expect(index.find((b) => b.key === "malik")?.description).toBe(want);
    expect(HADITH_BOOKS_STATIC.find((b) => b.key === "malik")?.description).toBe(want);
  });
});

describe("Printed hadith numbers", () => {
  it("are the same in the app and in the search text, for every entry", () => {
    for (const key of BOOKS) {
      const p = pack(key);
      const refs = hadithRefs(p.hadiths);
      const rows = text(key);
      expect(rows.length).toBe(refs.length);
      rows.forEach((row, i) => {
        expect(row[0], `${key}:${row[0]}`).toBe(p.hadiths[i]!.n);
        expect(row[3] ?? String(row[0]), `${key}:${row[0]}`).toBe(refs[i]);
      });
    }
  });

  it("cite Muslim by its printed number, with the narration when several share it", () => {
    const muslim = normalizeHadithPack(pack("muslim"));
    const intro = muslim.hadiths.filter((h) => h.r?.startsWith("i"));
    expect(intro.length).toBeGreaterThan(0);
    expect(hadithPlaceLabel(intro[0]!)).toBe("المقدمة ١");
    const first8 = findByPrintedNumber(muslim, 8)!;
    expect(first8.r).toBe("8/1");
    expect(hadithPlaceLabel(first8)).toBe("الحديث ٨ (١)");
    expect(hadithRefLabel("1144")).toBe("١١٤٤");
    // An entry the source left without a number belongs to the number before it.
    const i = muslim.hadiths.findIndex((h) => h.n === 1220);
    expect(muslim.hadiths[i]!.r!.split("/")[0]).toBe(muslim.hadiths[i - 1]!.r!.split("/")[0]);
  });

  it("keep decimal entries reachable (Bukhari 402.2)", () => {
    const bukhari = normalizeHadithPack(pack("bukhari"));
    expect(bukhari.hadiths.find((h) => h.n === 402.2)?.r).toBe("402/2");
    expect(findByPrintedNumber(bukhari, 402)?.n).toBe(402);
    expect(read("src/pages/HadithReader.tsx")).toContain('const n = Number(hadithNumber ?? "1");');
  });
});

describe("Hadith text and grades", () => {
  it("turns the forties' markup into lines, once", () => {
    const raw = "قَالَ: لَا تَغْضَبْ .<br>[رَوَاهُ الْبُخَارِيُّ] ، [وَمُسْلِمٌ]";
    expect(tidyHadithMarkup(raw)).toBe("قَالَ: لَا تَغْضَبْ .\nرَوَاهُ الْبُخَارِيُّ وَمُسْلِمٌ");
    expect(tidyHadithMarkup("رَوَاهُ مُسْلِمٌ [رقم:1].<br>[رَوَاهُ مُسْلِمٌ]")).toBe("رَوَاهُ مُسْلِمٌ [رقم:1].");
    expect(cleanHadithText("أ<br>ب")).toBe("أ\nب");
  });

  it("names every grade in the books in Arabic, and shows nothing for «-»", () => {
    const codes = new Set<string>();
    for (const key of BOOKS) for (const h of pack(key).hadiths) for (const g of h.g) codes.add(g);
    for (const code of codes) {
      if (code === "-") continue;
      expect(HADITH_GRADE_LABELS[code], code).toBeTruthy();
      expect(/[A-Za-z]/.test(hadithGradeLabel(code)), code).toBe(false);
    }
    expect(hadithGradeLabel("-")).toBe("");
    expect(hadithGradeLabel("mawdu")).toBe("موضوع");
  });

  it("reads Dorar's verdicts without their brackets", () => {
    expect(cleanVerdict("[صحيح]")).toBe("صحيح");
    expect(cleanVerdict("إسناده صحيح")).toBe("إسناده صحيح");
    expect(cleanVerdict("[قال ابنُ أبي حاتِمٍ] سألتُ أبي")).toBe("[قال ابنُ أبي حاتِمٍ] سألتُ أبي");
  });
});

describe("Search shows the words that matched", () => {
  it("finds a term whatever the harakat and alef forms", () => {
    const text = "قَالَ رَسُولُ اللَّهِ: مَنْ كَذَبَ عَلَيَّ مُتَعَمِّدًا فَلْيَتَبَوَّأْ مَقْعَدَهُ";
    const [match] = findArabicMatches(text, "كذب علي");
    expect(text.slice(match![0], match![1])).toBe("كَذَبَ عَلَيَّ");
    expect(highlightWindow(text, "كذب علي").filter((p) => p.hit).map((p) => p.text)).toEqual(["كَذَبَ عَلَيَّ"]);
    expect(findArabicMatches("إِنَّمَا الْأَعْمَالُ", "انما")).toHaveLength(1);
  });
});

describe("Hadith across the app", () => {
  it("opens a hadith «اسأل أثر» cites in the app's own book", () => {
    expect(hadithAppLink({ source: "صحيح مسلم", number: "١١٤٤" })).toBe("/hadith/muslim?ref=1144");
    expect(hadithAppLink({ source: "سنن أبي داود", number: "4607" })).toBe("/hadith/abudawud?ref=4607");
    expect(hadithAppLink({ source: "مسند أحمد", number: "١٢" })).toBeNull();
    expect(read("src/pages/HadithBookView.tsx")).toContain('params.get("ref")');
  });

  it("keeps curated cards honest: no template benefits, no «تحريري»", () => {
    for (const collection of ISLAMIC_LIBRARY_DB.collections.filter((c) => c.id !== "reader_guides")) {
      for (const entry of collection.entries) {
        expect(entry.benefits).toEqual([]);
        expect(entry.explanation).toBe("");
      }
    }
    for (const path of ["src/pages/HadithBooks.tsx", "src/pages/LibraryItem.tsx"]) expect(read(path)).not.toContain("تحريري");
  });

  it("has one «الحديث» entry in the Library, and the source lines live in the privacy page", () => {
    const library = read("src/pages/Library.tsx");
    expect(library).toContain('title: "الحديث",');
    expect(library).not.toContain('id: "sharh"');
    expect(library).not.toContain('id: "hadith-memo"');
    expect(read("src/pages/HadithBooks.tsx")).not.toContain("hadith-api");
    expect(read("public/privacy.html")).toContain("hadith-api");
  });

  it("offers «حديث اليوم» to Siri, iPhone search and the Lock Screen", () => {
    expect(SPOTLIGHT_SECTIONS.some((item) => item.route === "/hadith/today")).toBe(true);
    expect(read("ios/App/App/AtharIntents.swift")).toContain('OpenInApp.route("/hadith/today")');
    expect(read("ios/App/App/ar.lproj/AppShortcuts.strings")).toContain("حديث اليوم في ${applicationName}");
    expect(read("ios/App/AtharWidgets/AtharMoreWidgets.swift")).toContain(".supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])");
    expect(read("ios/App/AtharWidgets/AtharMoreWidgets.swift")).not.toContain('"/library/hadith"');
  });

  it("sends the Fajr hadith with the day's text, on its own switch", () => {
    const reminders = read("src/lib/reminders.ts");
    expect(reminders).toContain("if (reminders.dailyHadithNotif && prayerTimings) {");
    expect(reminders).toContain('route: daily ? `/library/sharh?h=${daily.id}` : "/hadith"');
  });
});

describe("Search spelling", () => {
  it("matches «علي» with «عَلَىَّ» and «صلاه» with «الصلاة»", async () => {
    const { normalizeArabicSearch } = await import("@/lib/arabic");
    expect(normalizeArabicSearch("عَلَىَّ")).toBe(normalizeArabicSearch("علي"));
    expect(normalizeArabicSearch("الصَّلاَةِ")).toContain(normalizeArabicSearch("صلاه"));
    expect(findArabicMatches("مَنْ كَذَبَ عَلَىَّ مُتَعَمِّدًا", "كذب علي متعمدا")).toHaveLength(1);
  });
});

describe("Bundle v2", () => {
  it("holds the whole text of every hadith, folded the way search reads it", async () => {
    const { foldHadithSearch } = await import("@/lib/fullHadithSearch");
    for (const key of BOOKS) {
      const p = pack(key);
      const rows = text(key);
      for (const i of [0, Math.floor(rows.length / 2), rows.length - 1]) expect(rows[i]![1]).toBe(foldHadithSearch(p.hadiths[i]!.t));
    }
    // A phrase deep inside a hadith, far past its first 260 characters.
    const bukhari1 = text("bukhari")[0]![1];
    expect(bukhari1.indexOf(foldHadithSearch("فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ"))).toBeGreaterThan(260);
  });

  it("names the scholar of each ruling, in Arabic", async () => {
    const { HADITH_GRADERS } = await import("@/data/hadithTypes");
    for (const key of ["abudawud", "tirmidhi", "nasai", "ibnmajah", "malik"]) {
      const p = pack(key);
      const graded = p.hadiths.filter((h) => h.gr?.length).length;
      expect(graded / p.hadiths.length, key).toBeGreaterThan(0.98);
      for (const h of p.hadiths) for (const [who, ruling] of h.gr ?? []) {
        expect(HADITH_GRADERS[who], `${key}:${h.n}`).toBeTruthy();
        expect(/[A-Za-z]/.test(ruling), `${key}:${h.n} ${ruling}`).toBe(false);
      }
    }
    const abudawud5 = pack("abudawud").hadiths.find((h) => h.n === 5)!;
    expect(abudawud5.gr).toEqual([[0, "شاذ"], [4, "شاذ"], [1, "إسناده صحيح"]]);
  });

  it("puts every ruling form into Arabic", async () => {
    // @ts-expect-error — a plain ES module script, no types.
    const { arabicRuling } = await import("../tools/scripts/hadith-bundle-v2.mjs");
    expect(arabicRuling("Isnaad Sahih")).toBe("إسناده صحيح");
    expect(arabicRuling("Sahih Isnaad")).toBe("صحيح الإسناد");
    expect(arabicRuling("Very Daif")).toBe("ضعيف جدًّا");
    expect(arabicRuling("Hasan Lighairihi")).toBe("حسن لغيره");
    expect(arabicRuling("Sahih - Agreed Upon")).toBe("صحيح، متفق عليه");
    expect(arabicRuling("Sahih Bukhari (1023) Sahih Muslim (894)")).toBe("رواه البخاري (١٠٢٣) ومسلم (٨٩٤)");
    expect(arabicRuling("-")).toBe("");
    expect(arabicRuling("Some Unknown Word")).toBeNull();
  });
});

