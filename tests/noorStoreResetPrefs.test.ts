// @vitest-environment jsdom
/**
 * Verifies that the narrowed resetPrefs only touches the keys it advertises
 * and leaves non-resettable prefs (custom accent, language, widgets, prayer
 * settings, etc.) untouched. Also checks the broader invariants:
 *   - resetPrefs preserves `progress` / `favorites` / `quranBookmarks`
 *     (the "no progress loss" contract that was true even before the narrow).
 *   - resetPrefs returns the user to the default theme, but never to a different
 *     bundled color scheme than DEFAULT_PREFS.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { useNoorStore } from "@/store/noorStore";

describe("resetPrefs (narrowed scope)", () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    // Each test starts from a clean store.
    useNoorStore.setState({
      prefs: {
        ...useNoorStore.getState().prefs,
        theme: "mushaf",
        fontScale: 1.6,
        lineHeight: 2.4,
        quranFontScale: 1.5,
        quranLineHeight: 3,
        quranPageSize: 25,
        quranHideMarkers: true,
        quranTheme: "sepia",
        quranLetterSpacing: 0.12,
        quranWordSpacing: 0.25,
        quranScrollMode: "scroll",
        quranDailyGoal: 100,
        quranReciter: "Abdul_Basit_Murattal_64kbps",
        mushafFontScale: 1.6,
        mushafTajweedMode: false,
        mushafShowTranslation: true,
        quranTranslationId: "jalandhry",
        quranSortMode: "recent",
        quranFilterJuz: 1,
        quranFilterRevelation: "meccan",
        showBenefits: false,
        stripDiacritics: true,
        enableSounds: true,
        reduceMotion: true,
        transparentMode: false,
        // Non-resettable prefs — must survive resetPrefs:
        customAccent: "#ff0000",
        arabicFont: "hafs",
        uiLanguage: "en",
        textDir: "ltr",
        homeWidgetsOrder: ["prayer", "dailyStep", "checklist", "hadith", "wisdom", "smart", "tasbeeh", "dailyWird", "dailyVerse", "quests"],
        biometricLock: true,
        autoAdvanceDhikr: false,
        prayerCalcMethod: 7,
        asrMadhab: 1,
        homeStripOrder: ["custom1"],
        mushafTextColor: "#abcdef",
        bgVibrancyBoost: false,
      },
      // Root-level state — must NEVER be cleared by resetPrefs:
      progress: { foo: 7 },
      favorites: { "adhkar:1": true },
      quranBookmarks: { "1:1": true },
      onboardingDone: true,
    });
  });

  it("reset() on prefs reverts to DEFAULT_PREFS for resettable keys", () => {
    useNoorStore.getState().resetPrefs();
    const p = useNoorStore.getState().prefs;
    const DEF = {
      theme: "forest",
      fontScale: 1.05,
      lineHeight: 1.95,
      quranFontScale: 1.1,
      quranLineHeight: 2.55,
      quranPageSize: 12,
      quranHideMarkers: false,
      quranTheme: "default",
      quranLetterSpacing: 0,
      quranWordSpacing: 0,
      quranScrollMode: "page",
      quranDailyGoal: 10,
      quranReciter: "Alafasy_128kbps",
      mushafFontScale: undefined,
      mushafTajweedMode: true,
      mushafShowTranslation: false,
      quranTranslationId: "saheeh",
      quranSortMode: "mushaf",
      quranFilterJuz: null,
      quranFilterRevelation: "all",
      showBenefits: true,
      stripDiacritics: false,
      enableSounds: false,
      reduceMotion: false,
      transparentMode: true,
      bgVibrancyBoost: undefined,
    } as const;
    for (const [k, v] of Object.entries(DEF)) {
      expect(p[k as keyof typeof p], `resetPrefs should reset ${k}`).toEqual(v);
    }
  });

  it("resetPrefs() preserves user-set non-resettable prefs", () => {
    useNoorStore.getState().resetPrefs();
    const p = useNoorStore.getState().prefs;
    expect(p.customAccent).toBe("#ff0000");
    expect(p.arabicFont).toBe("hafs");
    expect(p.uiLanguage).toBe("en");
    expect(p.textDir).toBe("ltr");
    expect(p.biometricLock).toBe(true);
    expect(p.asrMadhab).toBe(1);
    expect(p.prayerCalcMethod).toBe(7);
    expect(p.mushafTextColor).toBe("#abcdef");
    expect(p.homeStripOrder).toEqual(["custom1"]);
  });

  it("resetPrefs() does NOT touch root-level progress / favorites / Quran bookmarks", () => {
    useNoorStore.getState().resetPrefs();
    const s = useNoorStore.getState();
    expect(s.progress).toEqual({ foo: 7 });
    expect(s.favorites).toEqual({ "adhkar:1": true });
    expect(s.quranBookmarks).toEqual({ "1:1": true });
    expect(s.onboardingDone).toBe(true);
  });

  it("resetPrefs() preserves user reordering of homeWidgetsOrder", () => {
    useNoorStore.getState().resetPrefs();
    expect(useNoorStore.getState().prefs.homeWidgetsOrder[0]).toBe("prayer");
    expect(useNoorStore.getState().prefs.homeWidgetsOrder[1]).toBe("dailyStep");
  });
});
