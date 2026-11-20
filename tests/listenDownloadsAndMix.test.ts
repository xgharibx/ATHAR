import { afterEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  isNative: true,
  download: vi.fn(async (o: { urls: string[] }) => ({ saved: o.urls.length, failed: 0, evicted: 0 })),
  savedUrls: vi.fn(async (o: { urls: string[] }) => ({ saved: o.urls })),
  removeDownloads: vi.fn(async () => ({ removed: 1 })),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.isNative, getPlatform: () => (native.isNative ? "ios" : "web") },
  registerPlugin: () => native,
}));

import { randomMix, surahTrack, type Reciter } from "@/lib/listen/catalog";
import { AUTO_SAVE_AFTER_MS, LISTEN_MAX_FILE_BYTES, LISTEN_MAX_TOTAL_BYTES, downloadTracks, maybeAutoSave, reconcileDownloads, removeDownloadedTracks } from "@/lib/listen/downloads";
import { useListenStore } from "@/lib/listen/store";

const reciters: Reciter[] = [
  { id: 1, n: "القارئ الأول", m: [{ id: 11, r: "حفص عن عاصم", s: "مرتّل", u: "https://cdn.mp3quran.net/a/r1/", l: "1-114" }] },
  { id: 2, n: "القارئ الثاني", m: [{ id: 21, r: "حفص عن عاصم", s: "مرتّل", u: "https://cdn.mp3quran.net/b/r1/", l: "1-114" }] },
  { id: 3, n: "القارئ الثالث", m: [{ id: 31, r: "ورش عن نافع", s: "مرتّل", u: "https://cdn.mp3quran.net/c/", l: "1-3" }] },
];

afterEach(() => {
  native.isNative = true;
  vi.clearAllMocks();
  useListenStore.setState({ downloads: {}, autoSave: true });
});

describe("shuffle across every reciter and surah", () => {
  it("mixes reciters, never the same one twice in a row, nor a surah twice", () => {
    const mix = randomMix({ reciters }, 60);
    expect(mix.length).toBe(60);
    for (let i = 1; i < mix.length; i++) expect(mix[i]!.reciterId).not.toBe(mix[i - 1]!.reciterId);
    const surahs = mix.map((t) => t.surah);
    expect(new Set(surahs).size).toBe(surahs.length);
    expect(new Set(mix.map((t) => t.reciterId)).size).toBeGreaterThan(1);
    // Only surahs a recitation actually has.
    for (const t of mix.filter((x) => x.reciterId === 3)) expect(t.surah).toBeLessThanOrEqual(3);
  });

  it("is empty for an empty catalogue", () => {
    expect(randomMix({ reciters: [] })).toEqual([]);
  });
});

describe("saving recitations for offline", () => {
  const a = surahTrack(reciters[0]!, reciters[0]!.m[0]!, 2);
  const b = surahTrack(reciters[1]!, reciters[1]!.m[0]!, 2);

  it("keeps two reciters' alike-named files apart (the URLs differ, so do the saves)", () => {
    expect(a.url).toBe("https://cdn.mp3quran.net/a/r1/002.mp3");
    expect(b.url).toBe("https://cdn.mp3quran.net/b/r1/002.mp3");
  });

  it("hands whole surahs to the native downloader as a listening batch with room for long files", async () => {
    const result = await downloadTracks([a, b, a], { title: "x" });
    expect(result).toEqual({ saved: 2, total: 2 });
    const call = native.download.mock.calls[0]![0] as Record<string, unknown>;
    expect(call.kind).toBe("listen");
    expect(call.maxFileBytes).toBe(LISTEN_MAX_FILE_BYTES);
    expect(call.maxBytes).toBe(LISTEN_MAX_TOTAL_BYTES);
    expect(call.urls).toEqual([a.url, b.url]);
    expect(Object.keys(useListenStore.getState().downloads).sort()).toEqual([a.id, b.id].sort());
  });

  it("records only what reached the phone", async () => {
    native.savedUrls.mockResolvedValueOnce({ saved: [a.url] });
    expect(await downloadTracks([a, b])).toEqual({ saved: 1, total: 2 });
    expect(Object.keys(useListenStore.getState().downloads)).toEqual([a.id]);
  });

  it("saves what you keep listening to, once, and only when the switch is on", async () => {
    maybeAutoSave(a, AUTO_SAVE_AFTER_MS - 1);
    expect(native.download).not.toHaveBeenCalled();
    maybeAutoSave(a, AUTO_SAVE_AFTER_MS);
    maybeAutoSave(a, AUTO_SAVE_AFTER_MS + 5000);
    await vi.waitFor(() => expect(native.download).toHaveBeenCalledTimes(1));
    useListenStore.setState({ autoSave: false });
    maybeAutoSave(b, AUTO_SAVE_AFTER_MS);
    expect(native.download).toHaveBeenCalledTimes(1);
  });

  it("never downloads on the web", async () => {
    native.isNative = false;
    expect(await downloadTracks([a])).toBeNull();
    maybeAutoSave(b, AUTO_SAVE_AFTER_MS);
    expect(native.download).not.toHaveBeenCalled();
  });

  it("forgets files the phone no longer has, and removes on request", async () => {
    useListenStore.getState().markDownloaded([a, b]);
    native.savedUrls.mockResolvedValueOnce({ saved: [b.url] });
    const left = await reconcileDownloads();
    expect(left.map((t) => t.id)).toEqual([b.id]);
    await removeDownloadedTracks([b]);
    expect(native.removeDownloads).toHaveBeenCalledWith({ urls: [b.url] });
    expect(useListenStore.getState().downloads).toEqual({});
  });
});
