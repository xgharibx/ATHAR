import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (event: never) => void;
const native = vi.hoisted(() => ({
  platform: "android",
  listeners: new Map<string, Listener>(),
  play: vi.fn(async () => {}),
  stop: vi.fn(async () => {}),
  resume: vi.fn(async () => {}),
  setRate: vi.fn(async () => {}),
  setVolume: vi.fn(async () => {}),
  download: vi.fn(async () => ({ saved: 2, failed: 0, evicted: 1 })),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.platform !== "web", getPlatform: () => native.platform },
  registerPlugin: () => ({
    play: native.play,
    stop: native.stop,
    resume: native.resume,
    setRate: native.setRate,
    setVolume: native.setVolume,
    download: native.download,
    addListener: async (event: string, listener: Listener) => {
      native.listeners.set(event, listener);
      return { remove: async () => { native.listeners.delete(event); } };
    },
  }),
}));

import { planRecitationQueue, startNativeRecitation } from "@/lib/nativeRecitation";
import { everyAyahUrl, saveRecitationsOffline } from "@/lib/recitationDownloads";

const emit = (event: string, data?: unknown) => (native.listeners.get(event) as ((value: unknown) => void) | undefined)?.(data);
const verses = ["a", "b", "c"].map((id) => ({ id, url: `https://everyayah.com/data/x/${id}.mp3`, title: id, artist: "r" }));
const items = [1, 2, 3, 4, 5];
const base = { items, currentIndex: 1, loop: false, loopCount: 3, useRange: false, rangeStartIdx: 0, rangeEndIdx: 4, advance: false };

describe("native recitation queue", () => {
  it("plays one verse when nothing else is asked", () => {
    expect(planRecitationQueue(base)).toEqual({ items: [2], startIndex: 0, repeat: "none" });
  });

  it("repeats a verse the chosen number of times, or endlessly", () => {
    expect(planRecitationQueue({ ...base, loop: true, loopCount: 3 })).toEqual({ items: [2, 2, 2], startIndex: 0, repeat: "none" });
    expect(planRecitationQueue({ ...base, loop: true, loopCount: -1 })).toEqual({ items: [2], startIndex: 0, repeat: "one" });
  });

  it("continues to the end, or loops a range starting from the chosen verse", () => {
    expect(planRecitationQueue({ ...base, advance: true })).toEqual({ items: [2, 3, 4, 5], startIndex: 0, repeat: "none" });
    expect(planRecitationQueue({ ...base, advance: true, useRange: true, rangeStartIdx: 0, rangeEndIdx: 2 }))
      .toEqual({ items: [1, 2, 3], startIndex: 1, repeat: "all" });
    expect(planRecitationQueue({ ...base, currentIndex: 4, advance: true, useRange: true, rangeStartIdx: 0, rangeEndIdx: 2 }))
      .toEqual({ items: [1, 2, 3], startIndex: 0, repeat: "all" });
  });

  it("builds the reciter's verse URL", () => {
    expect(everyAyahUrl("Alafasy_128kbps", 2, 255)).toBe("https://everyayah.com/data/Alafasy_128kbps/002255.mp3");
  });
});

describe("native recitation session", () => {
  beforeEach(() => {
    native.platform = "android";
    native.listeners.clear();
    for (const fn of [native.play, native.stop, native.resume, native.setRate, native.setVolume, native.download]) fn.mockClear();
  });

  it("reports verses, pauses and the end, then lets go of the player", async () => {
    const events = { onVerse: vi.fn(), onState: vi.fn(), onEnded: vi.fn(), onError: vi.fn() };
    const session = await startNativeRecitation({ verses, startIndex: 1, rate: 1.25, volume: 0.8, repeat: "none" }, events);
    expect(native.play).toHaveBeenCalledWith({ items: verses, startIndex: 1, rate: 1.25, volume: 0.8, repeat: "none" });

    emit("itemChange", { index: 2, id: "c" });
    expect(events.onVerse).toHaveBeenCalledWith(2, "c");
    emit("stateChange", { state: "paused" });
    expect(session?.paused).toBe(true);
    session?.resume();
    expect(native.resume).toHaveBeenCalled();

    emit("ended");
    expect(events.onEnded).toHaveBeenCalledOnce();
    expect(native.listeners.size).toBe(0);
    expect(session?.paused).toBe(false);
  });

  it("stops the native player when the Mushaf pauses, and forwards speed and volume", async () => {
    const events = { onVerse: vi.fn(), onState: vi.fn(), onEnded: vi.fn(), onError: vi.fn() };
    const session = await startNativeRecitation({ verses, startIndex: 0, rate: 1, volume: 1, repeat: "all" }, events);
    session!.setRate(1.5);
    session!.volume = 0.4;
    expect(native.setRate).toHaveBeenCalledWith({ rate: 1.5 });
    expect(native.setVolume).toHaveBeenCalledWith({ volume: 0.4 });
    expect(session!.volume).toBe(0.4);
    session!.pause();
    expect(native.stop).toHaveBeenCalledOnce();
    emit("itemChange", { index: 1, id: "b" });
    expect(events.onVerse).not.toHaveBeenCalled();
  });

  it("returns null without a native player, so the web player takes over", async () => {
    native.platform = "web";
    const events = { onVerse: vi.fn(), onState: vi.fn(), onEnded: vi.fn(), onError: vi.fn() };
    expect(await startNativeRecitation({ verses, startIndex: 0, rate: 1, volume: 1, repeat: "none" }, events)).toBeNull();
    native.platform = "android";
    native.play.mockRejectedValueOnce(new Error("not implemented"));
    expect(await startNativeRecitation({ verses, startIndex: 0, rate: 1, volume: 1, repeat: "none" }, events)).toBeNull();
    expect(native.listeners.size).toBe(0);
  });

  it("saves offline verses as files in the apps", async () => {
    const progress = vi.fn();
    const urls = [verses[0]!.url, verses[1]!.url];
    native.download.mockImplementationOnce(async () => {
      emit("downloadProgress", { done: 1, total: 2 });
      return { saved: 2, failed: 0, evicted: 1 };
    });
    await expect(saveRecitationsOffline(urls, progress)).resolves.toEqual({ saved: 2, evicted: 1 });
    expect(native.download).toHaveBeenCalledWith({ urls, maxBytes: 1024 * 1024 * 1024 });
    expect(progress).toHaveBeenCalledWith(1, 2);
  });
});
