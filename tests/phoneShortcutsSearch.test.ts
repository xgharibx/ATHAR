import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: "android",
  setContinueReading: vi.fn(async (_options: { page: number; label: string }) => undefined),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => mocks.platform },
  registerPlugin: vi.fn(() => ({ setContinueReading: mocks.setContinueReading })),
}));

import { buildSpotlightItems, plainSurahName, SPOTLIGHT_SECTIONS } from "@/lib/spotlight";
import { continueReadingLabel, startContinueReadingShortcut } from "@/lib/continueReading";
import { useNoorStore } from "@/store/noorStore";

const quran = JSON.parse(fs.readFileSync("public/data/quran.json", "utf8")) as {
  surahs: Array<{ id: number; name: string; englishName: string; ayahs: string[] }>;
};
const adhkar = JSON.parse(fs.readFileSync("public/data/adhkar.json", "utf8")) as { sections: Array<{ id: string; title: string }> };
/** The same check as AppDelegate.isSafeRoute. */
const SAFE_ROUTE = /^\/[A-Za-z0-9/_-]*(\?[A-Za-z0-9_=&-]*)?$/;

describe("Siri knows the surahs by the app's names", () => {
  it("SurahNames.swift is generated from the Mushaf's surah names", () => {
    const swift = fs.readFileSync("ios/App/App/SurahNames.swift", "utf8");
    const rows = [...swift.matchAll(/^ {8}\("([^"]+)", "([^"]+)"\),$/gm)].map((m) => [m[1], m[2]]);
    expect(rows).toEqual(quran.surahs.map((surah) => [plainSurahName(surah.name), surah.englishName]));
    expect(rows[0][0]).toBe("الفاتحة");
    expect(rows[2][0]).toBe("آل عمران");
    expect(rows[17][0]).toBe("الكهف");
  });

  it("opens each action on its screen", () => {
    const intents = fs.readFileSync("ios/App/App/AtharIntents.swift", "utf8");
    for (const route of ['"/sebha"', '"/c/morning"', '"/c/evening"', '"/quran/page"', '"/qibla"', '"/quran/read/\\(surah.id)"']) {
      expect(intents).toContain(`OpenInApp.route(${route})`);
    }
    expect(fs.readFileSync("ios/App/App/AppDelegate.swift", "utf8")).toContain("AtharShortcuts.updateAppShortcutParameters()");
  });
});

describe("Athar in iPhone search", () => {
  const items = buildSpotlightItems(quran.surahs, adhkar.sections);

  it("lists the main screens, all 114 surahs and the adhkar sections", () => {
    expect(items.length).toBe(SPOTLIGHT_SECTIONS.length + 114 + adhkar.sections.length);
    expect(items).toContainEqual(expect.objectContaining({ route: "/quran/read/18", title: "سورة الكهف" }));
    expect(items).toContainEqual(expect.objectContaining({ route: "/c/morning", title: "أذكار الصباح" }));
    expect(new Set(items.map((item) => item.route)).size).toBe(items.length);
  });

  it("only uses routes the app accepts back from search", () => {
    for (const item of items) expect(item.route).toMatch(SAFE_ROUTE);
    expect(fs.readFileSync("ios/App/App/AppDelegate.swift", "utf8")).toContain("CSSearchableItemActionType");
    expect(fs.readFileSync("ios/App/App/AtharBridgeViewController.swift", "utf8")).toContain("registerPluginInstance(SpotlightPlugin())");
  });
});

describe("Android «تابع القراءة» shortcut", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.setContinueReading.mockClear();
    useNoorStore.setState((state) => ({ prefs: { ...state.prefs, quranMushafPage: 1 } }));
  });

  it("follows the last page read once it settles", () => {
    const stop = startContinueReadingShortcut(1000);
    vi.advanceTimersByTime(1000);
    expect(mocks.setContinueReading).toHaveBeenLastCalledWith({ page: 1, label: continueReadingLabel(1) });

    for (const page of [2, 3, 4]) useNoorStore.setState((state) => ({ prefs: { ...state.prefs, quranMushafPage: page } }));
    vi.advanceTimersByTime(999);
    expect(mocks.setContinueReading).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(mocks.setContinueReading).toHaveBeenLastCalledWith({ page: 4, label: "تابع القراءة — صفحة ٤" });
    stop();
    vi.useRealTimers();
  });

  it("is registered and opens the Mushaf page", () => {
    expect(fs.readFileSync("android/app/src/main/java/com/athar/adhkar/AtharActivity.java", "utf8")).toContain("registerPlugin(AppShortcutsPlugin.class)");
    const plugin = fs.readFileSync("android/app/src/main/java/com/athar/adhkar/AppShortcutsPlugin.java", "utf8");
    expect(plugin).toContain('"/quran/page/" + page');
    expect(plugin).toContain("pushDynamicShortcut");
  });
});
