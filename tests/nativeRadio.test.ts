import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (event: Record<string, unknown>) => void;

function mockNativePlayer() {
  const listeners = new Map<string, Set<Listener>>();
  const plugin = {
    play: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
    resume: vi.fn(() => Promise.resolve()),
    setVolume: vi.fn(() => Promise.resolve()),
    setRate: vi.fn(() => Promise.resolve()),
    addListener: vi.fn((event: string, listener: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      return Promise.resolve({ remove: () => { listeners.get(event)?.delete(listener); return Promise.resolve(); } });
    }),
  };
  const emit = (event: string, data: Record<string, unknown> = {}) => {
    for (const listener of [...(listeners.get(event) ?? [])]) listener(data);
  };
  vi.doMock("@capacitor/core", () => ({
    Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
    registerPlugin: () => plugin,
  }));
  vi.doMock("@/lib/mediaSession", () => ({
    claimMediaSession: vi.fn(() => Promise.resolve()),
    releaseMediaSession: vi.fn(() => Promise.resolve()),
    setMediaPlaybackState: vi.fn(() => Promise.resolve()),
  }));
  return { plugin, emit };
}

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

describe("the radio in the apps", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("@capacitor/core");
    vi.doUnmock("@/lib/mediaSession");
    vi.useRealTimers();
  });

  it("plays the stations in the native player as live streams", async () => {
    const { plugin, emit } = mockNativePlayer();
    const radio = await import("@/lib/radioPlayer");
    radio.playRadio(2);
    await flush();

    expect(plugin.play).toHaveBeenCalledTimes(1);
    const options = (plugin.play.mock.calls[0] as unknown as [{ items: unknown[]; startIndex: number; live: boolean; repeat: string }])[0];
    expect(options.live).toBe(true);
    expect(options.repeat).toBe("all");
    expect(options.startIndex).toBe(2);
    expect(options.items).toHaveLength(radio.QURAN_RADIO_STATIONS.length);
    expect(radio.getRadioState()).toMatchObject({ playing: true, loading: true, stationIdx: 2 });

    emit("stateChange", { state: "playing" });
    expect(radio.getRadioState()).toMatchObject({ playing: true, loading: false });

    // Next station from the lock screen.
    emit("itemChange", { index: 3, id: "radio:3" });
    expect(radio.getRadioState().stationIdx).toBe(3);

    // Paused from the lock screen, then carried on from the app.
    emit("stateChange", { state: "paused" });
    expect(radio.getRadioState().playing).toBe(false);
    radio.toggleRadio();
    expect(plugin.resume).toHaveBeenCalledTimes(1);

    radio.stopRadio();
    expect(plugin.stop).toHaveBeenCalled();
    expect(radio.getRadioState()).toMatchObject({ playing: false, loading: false });
  });

  it("moves to the next station when one fails", async () => {
    const { plugin, emit } = mockNativePlayer();
    const radio = await import("@/lib/radioPlayer");
    radio.playRadio(0);
    await flush();
    emit("error", { message: "source error", index: 0 });
    await flush();
    expect(plugin.play).toHaveBeenCalledTimes(2);
    expect((plugin.play.mock.calls[1] as unknown as [{ startIndex: number }])[0].startIndex).toBe(1);
    expect(radio.getRadioState().stationIdx).toBe(1);
    radio.stopRadio();
  });

  it("stops showing as playing when a Mushaf recitation takes over the player, and vice versa", async () => {
    const { emit } = mockNativePlayer();
    const radio = await import("@/lib/radioPlayer");
    const { startNativeRecitation } = await import("@/lib/nativeRecitation");

    radio.playRadio(0);
    await flush();
    emit("stateChange", { state: "playing" });
    const verseEvents = { onVerse: vi.fn(), onState: vi.fn(), onEnded: vi.fn(), onError: vi.fn(), onInterrupted: vi.fn() };
    const session = await startNativeRecitation(
      { verses: [{ id: "1:1", url: "https://example.org/001001.mp3", title: "الفاتحة", artist: "" }], startIndex: 0, rate: 1, volume: 1, repeat: "none" },
      verseEvents,
    );
    expect(session).not.toBeNull();
    expect(radio.getRadioState().playing).toBe(false);

    // Radio events no longer reach the radio, and verse events reach the Mushaf.
    emit("itemChange", { index: 0, id: "1:1" });
    expect(verseEvents.onVerse).toHaveBeenCalledWith(0, "1:1");
    expect(radio.getRadioState().stationIdx).toBe(0);

    radio.playRadio(1);
    await flush();
    expect(verseEvents.onInterrupted).toHaveBeenCalledTimes(1);
    radio.stopRadio();
  });

  it("reconnects a station whose stream drops after playing a while", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    const { plugin, emit } = mockNativePlayer();
    const radio = await import("@/lib/radioPlayer");
    radio.playRadio(4);
    await flush();
    emit("stateChange", { state: "playing" });
    vi.setSystemTime(Date.now() + 60_000);
    emit("ended");
    await flush();
    expect(plugin.play).toHaveBeenCalledTimes(2);
    expect((plugin.play.mock.calls[1] as unknown as [{ startIndex: number }])[0].startIndex).toBe(4);
    radio.stopRadio();
  });

  it("marks the stations as live on both phones", () => {
    const ios = readFileSync(resolve(process.cwd(), "ios/App/App/QuranAudioPlugin.swift"), "utf8");
    const android = readFileSync(resolve(process.cwd(), "android/app/src/main/java/com/athar/adhkar/QuranAudioPlugin.java"), "utf8");
    // The plugin builds its media items through ListenWidget (shared with the «السماع» widget).
    const items = readFileSync(resolve(process.cwd(), "android/app/src/main/java/com/athar/adhkar/ListenWidget.java"), "utf8");
    expect(ios).toContain("MPNowPlayingInfoPropertyIsLiveStream: live");
    expect(ios).toContain('call.getBool("live")');
    expect(android).toContain("ListenWidget.station(");
    expect(items).toContain("MEDIA_TYPE_RADIO_STATION");
    expect(android).toContain('call.getBoolean("live", false)');
  });
});
