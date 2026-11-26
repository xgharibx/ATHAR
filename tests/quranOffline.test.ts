import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { parseTanzil } from "@/quran2/data/text";
import { parseLines } from "@/quran2/data/lines";
import { parseMadinaPage } from "@/quran2/data/madina";

const read = (p: string) => readFileSync(p, "utf8");
type LayoutPage = Array<[string, Array<[number, number, string]>]>;
const layout = JSON.parse(gunzipSync(readFileSync("public/data/quran2/madina-layout.json.gz")).toString("utf8")) as LayoutPage[];
const text = parseTanzil(read("public/data/quran2/tanzil-uthmani.txt"));
const wordCount = (s: number, a: number) => text.surahs[s - 1]?.ayahs[a - 1]?.words.length;

describe("the Quran comes with the app: the Madina mushaf's pages, kept in it", () => {
  it("has the 604 pages, every ayah, every word on a line 1–15", () => {
    expect(layout).toHaveLength(604);
    const seen = new Set<string>();
    for (const page of layout) {
      for (const [key, words] of page) {
        seen.add(key);
        for (const [, line, code] of words) {
          expect(line).toBeGreaterThanOrEqual(1);
          expect(line).toBeLessThanOrEqual(15);
          expect(code.length).toBeGreaterThan(0);
        }
      }
    }
    expect(seen.size).toBe(6236);
  });

  it("gives every ayah of the Tanzil text its words, in order, on its page", () => {
    const verses = new Map<string, Array<[number, number, string]>>();
    for (const page of layout) for (const [key, words] of page) verses.set(key, [...(verses.get(key) ?? []), ...words]);
    let ayahs = 0;
    for (const surah of text.surahs) {
      for (const ayah of surah.ayahs) {
        const words = (verses.get(`${surah.id}:${ayah.a}`) ?? []).filter(([pos]) => pos > 0);
        const want = ayah.words.length;
        expect(words.map(([pos]) => pos), `${surah.id}:${ayah.a}`).toEqual(Array.from({ length: want }, (_, i) => i + 1));
        ayahs++;
      }
    }
    expect(ayahs).toBe(6236);
  });

  it("lays out the page in both views from it", () => {
    const page = layout[0]!.map(([key, words]) => ({
      verse_key: key,
      verse_number: Number(key.split(":")[1]),
      words: words.map(([position, line, code]) => ({ char_type_name: position ? "word" : "end", position, line_number: line, code_v2: code })),
    }));
    const madina = parseMadinaPage(1, page, wordCount);
    expect(madina.linked).toHaveLength(7);
    expect(madina.glyphs.filter((g) => g.n === 0)).toHaveLength(7);
    const lines = parseLines(page, text.surahs[0]!.ayahs.map((a) => a.words.length));
    expect(lines.every((l) => l !== null)).toBe(true);
  });

  it("is kept for reading offline on the website too", () => {
    expect(read("vite.config.ts")).toContain('"data/quran2/madina-layout.json.gz"');
  });
});

describe("the Quran section and «السماع» show no source lines (they are in the privacy policy)", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
    });
  const screens = [...files("src/quran2"), ...files("src/pages/listen"), ...files("src/components/listen")];

  it("names no provider on any screen", () => {
    for (const f of screens) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      for (const name of ["Quran.com", "tanzil.net", "مشروع تنزيل", "mp3quran", "QuranicAudio", "أرشيف الإنترنت", "HisnLabs", "MORPHOLOGY_CREDIT"]) {
        expect(src.includes(name), `${f}: ${name}`).toBe(false);
      }
    }
  });

  it("lists every source and its licence in the privacy policy, in both languages", () => {
    const policy = read("public/privacy.html");
    expect(policy).toContain('id="sources"');
    expect(policy).toContain('id="sources-en"');
    for (const name of ["tanzil.net", "Quran.com", "mp3quran.net", "QuranicAudio", "archive.org", "HisnLabs Tajweed v2", "quran-transcript", "GPL"]) expect(policy).toContain(name);
  });
});

describe("one bar for the Quran section, and its downloads", () => {
  it("has no row of tabs over the app's own bar; each page has its title (and a way back in the classic design)", () => {
    const shell = read("src/quran2/Quran2Shell.tsx");
    expect(shell).not.toContain("q2-tabs");
    expect(shell).toContain("<QuranHead />");
    expect(shell).toContain('aria-label="إلى القرآن الكريم"');
  });

  it("reaches «التنزيلات» from the section's home", () => {
    expect(read("src/quran2/pages/Hub.tsx")).toContain('to: "/quran/downloads"');
    expect(read("src/App.tsx")).toContain('<Route path="downloads" element={<S><Q2Downloads /></S>} />');
  });

  it("writes its cards and labels in IBM Plex Sans Arabic, its titles in Amiri", () => {
    const css = read("src/quran2/quran2.css");
    expect(css).toContain('--q2-display: "IBM Plex Sans Arabic"');
    expect(css).toContain('--q2-title: "Amiri"');
  });
});

describe("«السماع» without covers", () => {
  it("draws no cover anywhere", () => {
    expect(() => statSync("src/components/listen/ReciterMark.tsx")).toThrow();
    const home = read("src/pages/listen/ListenHome.tsx");
    expect(home).toContain("<ReciterNameCard");
    expect(home).not.toContain("ls-album-art");
  });
});
