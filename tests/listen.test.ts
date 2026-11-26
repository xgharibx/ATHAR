// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  albumTrack,
  initials,
  normalizeArabic,
  parseSurahList,
  qiyamTrack,
  surahTrack,
  type ListenCatalog,
} from "@/lib/listen/catalog";
import { ayahAt } from "@/lib/listen/timing";
import { lastSevenDays, listeningStreak, resumable, dayKey, useListenStore } from "@/lib/listen/store";
import { MOMENTS, momentTracks } from "@/lib/listen/moments";
import { countAr, AYAH, SURAH } from "@/lib/arabicCount";

const catalog = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/listen/catalog.json"), "utf8")) as ListenCatalog;

describe("the listening catalogue", () => {
  it("holds the world's reciters, the golden recordings, the Haram night prayers and the tawasheeh", () => {
    expect(catalog.reciters.length).toBeGreaterThan(200);
    expect(catalog.golden.length).toBeGreaterThanOrEqual(6);
    expect(catalog.qiyam.some((q) => q.city === "makkah")).toBe(true);
    expect(catalog.qiyam.some((q) => q.city === "madinah")).toBe(true);
    expect(catalog.tawasheeh.reduce((n, a) => n + a.tracks.length, 0)).toBeGreaterThan(150);
    for (const id of catalog.famous) expect(catalog.reciters.some((r) => r.id === id)).toBe(true);
  });

  it("stays small enough to load when the section opens", () => {
    expect(readFileSync(resolve(process.cwd(), "public/data/listen/catalog.json")).byteLength).toBeLessThan(260 * 1024);
  });

  it("builds a playable URL for each surah, night prayer and tawsheeh", () => {
    const alafasy = catalog.reciters.find((r) => r.id === 123)!;
    const t = surahTrack(alafasy, alafasy.m[0]!, 18);
    expect(t.url).toMatch(/^https:\/\/.+\/018\.mp3$/);
    expect(t.title).toBe("سورة الكهف");
    expect(t.timing).toBeTruthy();
    const night = qiyamTrack(catalog.qiyam[0]!, 1);
    expect(night.url).toMatch(/quranicaudio\.com\/quran\/.+001\.mp3$/);
    expect(night.album).toContain("تراويح");
    const tawsheeh = albumTrack(catalog.tawasheeh[0]!, 0)!;
    expect(tawsheeh.url).toMatch(/^https:\/\/archive\.org\/download\//);
  });

  it("reads compressed surah lists", () => {
    expect(parseSurahList("1-3,5,7-9")).toEqual([1, 2, 3, 5, 7, 8, 9]);
    expect(parseSurahList("1-114")).toHaveLength(114);
  });

  it("searches Arabic names however they are spelled", () => {
    expect(normalizeArabic("المنشاوى")).toBe(normalizeArabic("المنشاوي"));
    expect(normalizeArabic("إدريس أبكر")).toBe(normalizeArabic("ادريس ابكر"));
    expect(initials("عبدالباسط عبدالصمد")).toBe("عع");
  });

  it("plays the moments in the preferred voice", () => {
    const kahf = momentTracks(catalog, MOMENTS.find((m) => m.id === "kahf")!, null);
    expect(kahf).toHaveLength(1);
    expect(kahf[0]!.surah).toBe(18);
  });
});

describe("the verses that follow the reciter", () => {
  const timings = [
    { ayah: 1, start: 13920, end: 24140 },
    { ayah: 2, start: 24140, end: 38040 },
    { ayah: 3, start: 38040, end: 50000 },
  ];
  it("finds the ayah being recited", () => {
    expect(ayahAt(timings, 5000)).toBe(0);
    expect(ayahAt(timings, 14000)).toBe(1);
    expect(ayahAt(timings, 27000)).toBe(2);
    expect(ayahAt(timings, 99000)).toBe(3);
  });
});

describe("your listening, kept", () => {
  it("counts a streak of days with at least a minute", () => {
    const today = new Date(2026, 10, 19);
    const d = (offset: number) => dayKey(new Date(2026, 10, 19 - offset));
    expect(listeningStreak({ [d(0)]: 300, [d(1)]: 90, [d(2)]: 61, [d(4)]: 600 }, today)).toBe(3);
    expect(listeningStreak({ [d(1)]: 300, [d(2)]: 300 }, today)).toBe(2);
    expect(listeningStreak({}, today)).toBe(0);
    expect(lastSevenDays({ [d(0)]: 120 }, today).at(-1)!.seconds).toBe(120);
  });

  it("offers to resume only tracks stopped part-way", () => {
    const track = { id: "m:1:1", url: "", title: "", artist: "", album: "", kind: "surah" as const };
    expect(resumable([{ track, at: 0, positionMs: 60_000, durationMs: 600_000 }])).toHaveLength(1);
    expect(resumable([{ track, at: 0, positionMs: 5_000, durationMs: 600_000 }])).toHaveLength(0);
    expect(resumable([{ track, at: 0, positionMs: 595_000, durationMs: 600_000 }])).toHaveLength(0);
  });

  it("lights a surah in the listening khatma once heard to the end", () => {
    const store = useListenStore.getState();
    store.restartKhatma();
    const track = { id: "m:123:67", url: "", title: "سورة الملك", artist: "مشاري العفاسي", album: "", kind: "surah" as const, surah: 67 };
    store.markCompleted(track);
    store.markCompleted(track);
    expect(useListenStore.getState().khatma.done).toEqual([67]);
    expect(useListenStore.getState().heard["67"]).toBeGreaterThanOrEqual(2);
    store.addListened(track, 120);
    expect(useListenStore.getState().byArtist["مشاري العفاسي"]).toBeGreaterThanOrEqual(120);
    store.addListened(track, 100_000); // never trusts an impossible report
    expect(useListenStore.getState().byArtist["مشاري العفاسي"]).toBeLessThan(1000);
  });
});

describe("Arabic number agreement", () => {
  it("says counts as Arabic does", () => {
    expect(countAr(1, AYAH)).toBe("آية واحدة");
    expect(countAr(2, AYAH)).toBe("آيتان");
    expect(countAr(7, AYAH)).toBe("٧ آيات");
    expect(countAr(286, AYAH)).toBe("٢٨٦ آية");
    expect(countAr(103, SURAH)).toBe("١٠٣ سور");
    expect(countAr(114, SURAH)).toBe("١١٤ سورة");
  });
});

describe("the ways in", () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
  it("draws the eye on the classic home (in place of the radio), and sits on the Quran page and in «أفق»", () => {
    const home = read("src/pages/Home.tsx");
    expect(home).toContain("<ListenSpotlight");
    expect(home).not.toContain("toggleRadio");
    // The floating button of the classic design is «السماع» now; the radio is one of its ways.
    expect(read("src/components/layout/AppShell.tsx")).toContain("<FloatingMedia drawerOpen={drawerOpen} />");
    expect(read("src/components/layout/FloatingMedia.tsx")).toContain('to: "/listen/golden"');
    expect(read("src/components/ufuq/UfuqHome.tsx")).toContain("<ListenEntry />");
    expect(read("src/components/ufuq/UfuqShell.tsx")).toContain('<ListenMiniPlayer variant="ufuq" />');
    expect(read("src/components/layout/AppShell.tsx")).toContain("<ListenMiniPlayer />");
  });

  it("reads its controls left to right, as every player does (earlier on the left, later on the right)", () => {
    const full = read("src/components/listen/FullPlayer.tsx");
    expect(full).toContain('<div className="ls-controls" dir="ltr">');
    expect(full).toContain('<div className="ls-seek mt-3" dir="ltr">');
    expect(full.indexOf('aria-label="السابق"')).toBeLessThan(full.indexOf('aria-label="التالي"'));
    expect(full).toMatch(/aria-label="السابق"[^]*?<SkipBack /);
    expect(full).toMatch(/aria-label="التالي"[^]*?<SkipForward /);
    expect(full).not.toContain("scaleX(-1)");
    const mini = read("src/components/listen/MiniPlayer.tsx");
    expect(mini).toContain('className="ls-mini-bar" dir="ltr"');
    expect(mini).toContain("<SkipForward");
  });

  it("can report position and seek in both native players", () => {
    expect(read("android/app/src/main/java/com/athar/adhkar/QuranAudioPlugin.java")).toContain("public void seek(PluginCall call)");
    expect(read("ios/App/App/QuranAudioPlugin.swift")).toContain('CAPPluginMethod(name: "position"');
  });
});
