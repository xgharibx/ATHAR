/**
 * «الإعجاز» reads in Arabic: every evidence card has an Arabic title and
 * text, the Arabic fields carry Arabic digits, and the numbers the pages show
 * are computed from the data (no hard-coded head starts or odds).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { miracles, miracleNumber } from "@/ijaz/data/miracles";
import { EVIDENCE_AR } from "@/ijaz/data/evidenceAr";
import { MIRACLE, PROOF, arabicTags, authorAr, discoveryYear, verseRefAr } from "@/ijaz/lib/utils";
import { countAr } from "@/lib/arabicCount";
import { MERGED_INTO, REMOVED, canonicalSlug } from "@/ijaz/data/aliases";
import { getMiracleBySlug } from "@/ijaz/data/miracles";

describe("ijaz in Arabic", () => {
  it("gives every scientific-evidence card an Arabic title and description", () => {
    for (const m of miracles) {
      for (const e of m.scientificEvidence) {
        expect(e.titleAr, `${m.slug}: ${e.title}`).toBeTruthy();
        expect(e.descriptionAr, `${m.slug}: ${e.title}`).toBeTruthy();
        expect(e.titleAr).toMatch(/[؀-ۿ]/);
      }
    }
  });

  it("has no orphan translations", () => {
    const keys = new Set(miracles.flatMap((m) => m.scientificEvidence.map((_, i) => `${m.slug}#${i}`)));
    // Keys of merged-away entries are fine: their cards moved with them.
    const gone = (k: string) => canonicalSlug(k.split("#")[0]!) !== k.split("#")[0];
    for (const k of Object.keys(EVIDENCE_AR)) expect(keys.has(k) || gone(k), k).toBe(true);
  });

  it("writes the Arabic fields with Arabic digits", () => {
    for (const m of miracles) {
      for (const t of [m.titleAr, m.summaryAr, m.descriptionAr, m.deepDiveAr ?? ""]) expect(t, m.slug).not.toMatch(/[0-9]/);
      for (const e of m.scientificEvidence) expect(`${e.titleAr}${e.descriptionAr}`, m.slug).not.toMatch(/[0-9]/);
    }
  });

  it("numbers the miracles 1…n with no gaps or halves", () => {
    const nums = miracles.map((m) => miracleNumber(m.slug)).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: miracles.length }, (_, i) => i + 1));
  });

  it("finds the year science confirmed a miracle", () => {
    const m = miracles.find((x) => x.slug === "universe-expansion")!;
    expect(discoveryYear(m)).toBe(1929);
  });

  it("formats references, counts and names in Arabic", () => {
    expect(verseRefAr("الذاريات", 47)).toBe("الذاريات: ٤٧");
    expect(verseRefAr("الطور", 35, 36)).toBe("الطور: ٣٥–٣٦");
    expect(countAr(86, MIRACLE)).toBe("٨٦ معجزة");
    expect(countAr(3, PROOF)).toBe("٣ أدلة");
    expect(countAr(2, PROOF)).toBe("دليلان");
    expect(arabicTags(["expansion", "توسع", "hubble", "الكون"])).toEqual(["توسع", "الكون"]);
    expect(authorAr("Dr. Haitham Talaat")).toBe("د. هيثم طلعت");
  });

  it("no longer shows made-up odds on the home page", () => {
    const home = readFileSync("src/ijaz/pages/IjazHome.tsx", "utf8");
    expect(home).not.toContain("10<sup>50</sup>");
    expect(home).not.toContain("1/10^26");
    expect(home).not.toMatch(/titleEn/);
  });
});


describe("merged duplicates", () => {
  it("keeps one entry per miracle and sends the old addresses to it", () => {
    const slugs = new Set(miracles.map((m) => m.slug));
    for (const [from, to] of Object.entries(MERGED_INTO)) {
      expect(slugs.has(from), from).toBe(false);
      expect(slugs.has(to), to).toBe(true);
      expect(getMiracleBySlug(from)?.slug).toBe(to);
    }
    for (const r of REMOVED) {
      expect(slugs.has(r)).toBe(false);
      expect(getMiracleBySlug(r)).toBeUndefined();
      expect(canonicalSlug(r)).toBe("");
    }
  });

  it("carries the merged entries' verses into the one that remains", () => {
    const embryo = getMiracleBySlug("embryology-stages")!;
    expect(embryo.verses.some((v) => v.surahNumber === 22 && v.ayahNumber === 5)).toBe(true);
    const verses = embryo.verses.map((v) => `${v.surahNumber}:${v.ayahNumber}`);
    expect(new Set(verses).size).toBe(verses.length);
  });

  it("never links a miracle to itself or to one that is gone", () => {
    const ids = new Set(miracles.map((m) => m.id));
    for (const m of miracles) for (const r of m.relatedMiracleIds) {
      expect(r).not.toBe(m.id);
      expect(ids.has(r), `${m.slug} → ${r}`).toBe(true);
    }
  });
});
