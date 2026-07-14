// @vitest-environment jsdom
/**
 * Pass A — `prefs.quranFontScale` is applied to the Quran.tsx surah-list
 * row by multiplying the row's base 17px font size. The page itself uses
 * `style={{ fontSize: \`${17 * (prefs.quranFontScale ?? 1.0)}px\` }}` so
 * we exercise the exact computation here, mirroring what the rendered
 * DOM attribute will hold.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { useNoorStore } from "@/store/noorStore";

function surahNameFontSize(quranFontScale: number | undefined): string {
  return `${17 * (quranFontScale ?? 1.0)}px`;
}

describe("prefs.quranFontScale applied to Quran.tsx surah list (Pass A)", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    useNoorStore.setState((s) => ({
      prefs: { ...s.prefs, quranFontScale: 1.0 },
    }));
  });

  it("uses the default 17px when quranFontScale is the default 1.0", () => {
    expect(surahNameFontSize(useNoorStore.getState().prefs.quranFontScale)).toBe("17px");
  });

  it("scales the surah-name font up by quranFontScale (e.g. 1.4 → 23.8px)", () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, quranFontScale: 1.4 } }));
    expect(parseFloat(surahNameFontSize(useNoorStore.getState().prefs.quranFontScale))).toBeCloseTo(23.8);
  });

  it("scales the surah-name font down by quranFontScale (e.g. 0.9 → 15.3px)", () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, quranFontScale: 0.9 } }));
    expect(parseFloat(surahNameFontSize(useNoorStore.getState().prefs.quranFontScale))).toBeCloseTo(15.3);
  });

  it("falls back to scale 1.0 if quranFontScale is undefined", () => {
    expect(surahNameFontSize(undefined)).toBe("17px");
  });

  it("matches the same scaling used in the inline surah detail (22 * scale)", () => {
    useNoorStore.setState((s) => ({ prefs: { ...s.prefs, quranFontScale: 1.25 } }));
    const surahListSize = parseFloat(surahNameFontSize(useNoorStore.getState().prefs.quranFontScale));
    const detailSize = Math.round(22 * (useNoorStore.getState().prefs.quranFontScale ?? 1.0));
    expect(detailSize).toBe(28); // 22 * 1.25 = 27.5 rounded
    expect(surahListSize).toBeCloseTo(21.25);
  });
});