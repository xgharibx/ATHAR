import { beforeEach, describe, expect, it } from "vitest";
import { quranTargetFor } from "@/quran2/redirectTarget";
import { adoptOldMarks, countAyahsRead, mirrorMarkToOld, noteLastRead, startQuranBridge } from "@/quran2/bridge";
import { useQ2Store } from "@/quran2/store";
import { useNoorStore } from "@/store/noorStore";
import { isKhatmaReminder, khatmaReminderChange, KHATMA_REMINDER_ROUTE, LEGACY_KHATMA_REMINDER_ROUTE } from "@/lib/khatmaReminder";
import { juzName, quarterLabel } from "@/quran2/data/divisions";
import { ufuqTabFor, ufuqTitleFor } from "@/components/ufuq/ufuqNav";
import { getLocalDateKey } from "@/lib/dayBoundaries";

describe("القرآن الكريم: the app's earlier Quran addresses lead to the same place", () => {
  it("maps the mushaf, the second section and the tafsir", () => {
    expect(quranTargetFor("mushaf", "/mushaf", "?surah=18&ayah=10")).toBe("/quran/read/18?a=10");
    expect(quranTargetFor("mushaf", "/mushaf", "?surah=36")).toBe("/quran/read/36");
    expect(quranTargetFor("mushaf", "/mushaf/293", "")).toBe("/quran/page/293");
    expect(quranTargetFor("mushaf", "/mushaf", "", "#page=12")).toBe("/quran/page/12");
    expect(quranTargetFor("mushaf", "/mushaf", "?khatma=1")).toBe("/quran/khatma");
    expect(quranTargetFor("mushaf", "/mushaf", "")).toBe("/quran/page");
    expect(quranTargetFor("mushaf", "/mushaf/9999", "")).toBe("/quran/page");
    expect(quranTargetFor("mushaf", "/mushaf", "?surah=٢&ayah=٢٥٥")).toBe("/quran/read/2?a=255");
    expect(quranTargetFor("q2", "/q2/hifz/session", "?x=1")).toBe("/quran/hifz/session?x=1");
    expect(quranTargetFor("q2", "/q2", "")).toBe("/quran");
    expect(quranTargetFor("tafsir", "/tafsir", "?surah=2&ayah=255")).toBe("/quran/tafsir/2/255");
    expect(quranTargetFor("tafsir", "/tafsir", "?surah=2")).toBe("/quran/tafsir/read/2");
    expect(quranTargetFor("tafsir", "/tafsir", "")).toBe("/quran/tafsir");
  });

  it("keeps a khatma reminder set up before the move, and moves it to the new address", () => {
    const old = { id: "r1", deeplink: { route: LEGACY_KHATMA_REMINDER_ROUTE }, title: "x", body: "y" } as never;
    expect(isKhatmaReminder(old)).toBe(true);
    const plan = { startISO: "2026-11-01", days: 30, version: 2 as const, done: {}, dailyAyahs: {} };
    const change = khatmaReminderChange(old, plan, "2026-11-10");
    expect(change.kind).toBe("update");
    expect(change.kind === "update" && change.patch.deeplink?.route).toBe(KHATMA_REMINDER_ROUTE);
  });

  it("names the juz' in words and the hizb marks as printed", () => {
    expect(juzName(1)).toBe("الجزء الأول");
    expect(juzName(24)).toBe("الجزء الرابع والعشرون");
    expect(juzName(30)).toBe("الجزء الثلاثون");
    expect(quarterLabel(1)).toBe("الحزب ١");
    expect(quarterLabel(186)).toBe("ربع الحزب ٤٧");
    expect(quarterLabel(187)).toBe("نصف الحزب ٤٧");
    expect(quarterLabel(188)).toBe("ثلاثة أرباع الحزب ٤٧");
  });

  it("places the Quran under «أفق»'s Quran tab, with its own titles", () => {
    expect(ufuqTabFor("/quran/tasmee")).toBe("quran");
    expect(ufuqTabFor("/quran-vocab")).toBe("quran");
    expect(ufuqTitleFor("/quran/khatma")).toBe("الختمة");
    expect(ufuqTitleFor("/quran/tafsir/read/2")).toBe("التفسير");
  });
});

describe("القرآن الكريم: one record of what you keep and read", () => {
  beforeEach(() => {
    useQ2Store.setState({ marks: {}, adoptedOld: false, lastRead: null });
    useNoorStore.setState({ quranBookmarks: {}, quranNotes: {}, quranHighlights: {}, quranLastRead: null, quranDailyAyahs: {}, khatmaStartISO: null, khatmaDays: null, khatmaDone: {} });
  });

  it("brings the earlier section's bookmarks, notes and colours in, and keeps its own", () => {
    useNoorStore.setState({ quranBookmarks: { "2:255": true }, quranNotes: { "2:255": "آية الكرسي", "1:1": "  " }, quranHighlights: { "18:10": "red", "3:8": "purple" }, quranLastRead: { surahId: 36, ayahIndex: 9 } });
    useQ2Store.setState({ marks: { "1:2": { color: "gold", at: 5 } } });
    adoptOldMarks();
    const marks = useQ2Store.getState().marks;
    expect(marks["2:255"]).toMatchObject({ bookmark: true, note: "آية الكرسي" });
    expect(marks["18:10"]).toMatchObject({ color: "rose" });
    expect(marks["1:1"]).toBeUndefined();
    expect(marks["3:8"]).toBeUndefined();
    expect(marks["1:2"]).toMatchObject({ color: "gold" });
    expect(useQ2Store.getState().adoptedOld).toBe(true);
    expect(useQ2Store.getState().lastRead).toMatchObject({ s: 36, a: 9 });
    // …and the section's own marks go to the account's fields.
    expect(useNoorStore.getState().quranHighlights["1:2"]).toBe("gold");
  });

  it("keeps the marks and the account's fields in step, both ways", () => {
    const stop = startQuranBridge();
    useQ2Store.getState().setMark(112, 1, { bookmark: true, note: "الإخلاص" });
    expect(useNoorStore.getState().quranBookmarks["112:1"]).toBe(true);
    expect(useNoorStore.getState().quranNotes["112:1"]).toBe("الإخلاص");
    useQ2Store.getState().setMark(112, 1, { bookmark: false, note: "" });
    expect(useNoorStore.getState().quranBookmarks["112:1"]).toBeUndefined();
    // From another device, through the account.
    useNoorStore.setState({ quranHighlights: { "67:1": "green" } });
    expect(useQ2Store.getState().marks["67:1"]).toMatchObject({ color: "green" });
    useNoorStore.setState({ quranHighlights: {} });
    expect(useQ2Store.getState().marks["67:1"]).toBeUndefined();
    stop();
  });

  it("counts what is read here for the day's wird, and ticks off the khatma plan's day", () => {
    const today = getLocalDateKey(new Date());
    useNoorStore.setState({ khatmaStartISO: today, khatmaDays: 30, khatmaScheduleVersion: 2, khatmaDone: {} });
    countAyahsRead(100);
    const st = useNoorStore.getState();
    expect(Object.values(st.quranDailyAyahs).reduce((a, b) => a + b, 0)).toBe(100);
    expect(st.khatmaDone[today]).toBeFalsy();
    countAyahsRead(120);
    expect(useNoorStore.getState().khatmaDone[today]).toBe(true);
  });

  it("tells the rest of the app where you stopped", () => {
    noteLastRead(18, 10, 294);
    expect(useNoorStore.getState().quranLastRead).toEqual({ surahId: 18, ayahIndex: 10 });
    expect(useNoorStore.getState().prefs.quranMushafPage).toBe(294);
    mirrorMarkToOld(1, 1, undefined);
  });
});
