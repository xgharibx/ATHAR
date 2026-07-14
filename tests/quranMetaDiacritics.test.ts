// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { maybeStripDiacritics, toArabicNumeral } from "@/lib/quranMeta";

describe("maybeStripDiacritics", () => {
  it("returns the input unchanged when strip=false", () => {
    const sample = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
    expect(maybeStripDiacritics(sample, false)).toBe(sample);
  });

  it("strips fatḥah, kasrah, ḍammah, shadda, sukun when strip=true", () => {
    const input = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
    const out = maybeStripDiacritics(input, true);
    expect(out).toBe("بسم الله الرحمن الرحيم");
    // Letters preserved
    expect(out).toContain("بسم");
    expect(out).toContain("الله");
    expect(out).toContain("الرحمن");
    expect(out).toContain("الرحيم");
    // No tashkeel remains
    expect(out).toMatch(/^[؀-ۿ\s]*$/);
  });

  it("strips tatweel / kashida (U+0640) is NOT touched (we only strip diacritics)", () => {
    const input = "بـسم";
    expect(maybeStripDiacritics(input, true)).toBe(input);
  });

  it("strips Quranic annotation signs (U+0610–U+061A)", () => {
    // ۩ is a Quranic annotation mark (U+06E9, falls in U+06D6–U+06ED) used
    // for sifr / sajda. We'll also test the small alef (U+0670) and a
    // sample mark.
    const input = "\u0670ع\u06E9";
    const out = maybeStripDiacritics(input, true);
    expect(out).toBe("ع");
  });

  it("returns empty string for empty input", () => {
    expect(maybeStripDiacritics("", true)).toBe("");
    expect(maybeStripDiacritics("", false)).toBe("");
  });

  it("handles digits + Arabic mix without altering digits", () => {
    const input = "سُورَةُ ٱلْبَقَرَةِ 2";
    const out = maybeStripDiacritics(input, true);
    // ٱ (U+0671 alef wasla) is intentionally retained as it's a base letter
    // that carries non-diacritic information.
    expect(out).toBe("سورة ٱلبقرة 2");
  });

  it("strips sup alef (U+0670)", () => {
    const input = "عَل\u0670ى"; // عَلـٰى — sup-alef after lam
    const out = maybeStripDiacritics(input, true);
    expect(out).toBe("على");
  });

  it("does not strip Arabic letters themselves (U+0620–U+0649 range preserved)", () => {
    const input = "العربية";
    const out = maybeStripDiacritics(input, true);
    expect(out).toBe(input);
  });
});

describe("toArabicNumeral (sanity)", () => {
  it("converts 0..9 digits to Arabic-Indic", () => {
    expect(toArabicNumeral(0)).toBe("٠");
    expect(toArabicNumeral(7)).toBe("٧");
    expect(toArabicNumeral(42)).toBe("٤٢");
  });
});
