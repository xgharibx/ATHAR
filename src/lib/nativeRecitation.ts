/**
 * The Mushaf's native recitation player in the Android and iOS apps
 * (QuranAudioPlugin: Media3 ExoPlayer in a media service on Android,
 * AVQueuePlayer on iOS).
 *
 * The web player made a new audio element per verse and only began loading
 * a verse when the previous one ended, so there was a pause between verses,
 * and on a locked iPhone the recitation could stop after the current verse.
 * The native players queue the whole run of verses, buffer the next one while
 * the current one plays, keep going in the background, and show the system's
 * own lock-screen and notification controls.
 *
 * Verses saved for offline listening are kept as files by the native side,
 * because the web view's caches are wiped each time the app opens.
 */
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type RecitationVerse = { id: string; url: string; title: string; artist: string };
export type RecitationRepeat = "none" | "one" | "all";
export type RecitationState = "playing" | "paused" | "buffering" | "stopped";

/** Room for several juz' of recitation; the oldest verses go first beyond it. */
export const NATIVE_RECITATION_MAX_BYTES = 1024 * 1024 * 1024;

type QuranAudioPlugin = {
  play(options: {
    items: RecitationVerse[];
    startIndex: number;
    rate: number;
    volume: number;
    repeat: RecitationRepeat;
    /** Live radio streams: nothing is buffered ahead, and the lock screen shows a live broadcast. */
    live?: boolean;
  }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  setRate(options: { rate: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  /** Downloads in the background: it carries on after the app is left (Android WorkManager, iOS background session). */
  download(options: { urls: string[]; maxBytes: number; title?: string }): Promise<{ saved: number; failed: number; evicted: number }>;
  downloadedBytes(): Promise<{ bytes: number }>;
  clearDownloads(): Promise<void>;
  addListener(event: "itemChange", listener: (event: { index: number; id: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: "stateChange", listener: (event: { state: RecitationState }) => void): Promise<PluginListenerHandle>;
  addListener(event: "ended", listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: "error", listener: (event: { message: string; index: number }) => void): Promise<PluginListenerHandle>;
  addListener(event: "downloadProgress", listener: (event: { done: number; total: number }) => void): Promise<PluginListenerHandle>;
};

let plugin: QuranAudioPlugin | null = null;

function nativePlugin(): QuranAudioPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  plugin ??= registerPlugin<QuranAudioPlugin>("QuranAudio");
  return plugin;
}

export function hasNativeRecitation(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * The parts of an audio element the Mushaf uses, so the rest of the page can
 * stop or change the volume of either player the same way.
 */
export type RecitationHandle = {
  /** Ends the recitation (the Mushaf's pause button stops, then starts again from a verse). */
  pause(): void;
  volume: number;
};

export type NativeRecitationSession = RecitationHandle & {
  setRate(rate: number): void;
  /** Continue after a pause from the lock screen, headphones or a phone call. */
  resume(): void;
  readonly paused: boolean;
};

export type NativeRecitationEvents = {
  onVerse(index: number, id: string): void;
  onState(state: RecitationState): void;
  onEnded(): void;
  onError(message: string, index: number): void;
  /** Another player (the radio, or a new recitation) took over the native player. */
  onInterrupted?(): void;
};

/**
 * One native player serves the Mushaf and the radio. Whoever starts it last
 * owns it: the previous owner stops listening to its events and is told it
 * was interrupted, so the two never mix up each other's verses or stations.
 */
let owner: { id: number; interrupt(): void } | null = null;
let ownerSeq = 0;

function takeOverPlayer(interrupt: () => void): number {
  const previous = owner;
  const id = ++ownerSeq;
  owner = { id, interrupt };
  previous?.interrupt();
  return id;
}

function ownsPlayer(id: number): boolean {
  return owner?.id === id;
}

function releasePlayer(id: number): void {
  if (owner?.id === id) owner = null;
}

/**
 * Hand a run of verses to the native player. Resolves to null when this app
 * build has no native player, so the caller can use the web player instead.
 */
export async function startNativeRecitation(
  options: { verses: RecitationVerse[]; startIndex: number; rate: number; volume: number; repeat: RecitationRepeat; live?: boolean },
  events: NativeRecitationEvents,
): Promise<NativeRecitationSession | null> {
  const native = nativePlugin();
  if (!native || options.verses.length === 0) return null;

  const handles: PluginListenerHandle[] = [];
  let ended = false;
  let paused = false;
  let volume = options.volume;
  const detach = () => {
    for (const handle of handles.splice(0)) void handle.remove().catch(() => {});
  };
  let ownerId = 0;
  const end = () => {
    if (ended) return;
    ended = true;
    detach();
    releasePlayer(ownerId);
  };
  ownerId = takeOverPlayer(() => {
    if (ended) return;
    end();
    events.onInterrupted?.();
  });

  try {
    handles.push(
      await native.addListener("itemChange", ({ index, id }) => {
        if (!ended) events.onVerse(index, id);
      }),
      await native.addListener("stateChange", ({ state }) => {
        if (ended) return;
        paused = state === "paused";
        events.onState(state);
      }),
      await native.addListener("ended", () => {
        if (ended) return;
        end();
        events.onEnded();
      }),
      await native.addListener("error", ({ message, index }) => {
        if (!ended) events.onError(message, index);
      }),
    );
    await native.play({
      items: options.verses,
      startIndex: options.startIndex,
      rate: options.rate,
      volume: options.volume,
      repeat: options.repeat,
      ...(options.live ? { live: true } : {}),
    });
  } catch {
    // An app build from before the native player.
    end();
    return null;
  }

  return {
    pause() {
      if (ended) return;
      const stillOwner = ownsPlayer(ownerId);
      end();
      if (stillOwner) void native.stop().catch(() => {});
    },
    get volume() {
      return volume;
    },
    set volume(next: number) {
      volume = next;
      if (!ended) void native.setVolume({ volume: next }).catch(() => {});
    },
    setRate(rate: number) {
      if (!ended) void native.setRate({ rate }).catch(() => {});
    },
    resume() {
      if (!ended) void native.resume().catch(() => {});
    },
    get paused() {
      return paused && !ended;
    },
  };
}

/** Save verses for offline listening as files on the device. Null when this app build cannot. */
export async function downloadNativeRecitations(
  urls: string[],
  onProgress: (done: number, total: number) => void,
  title?: string,
): Promise<{ saved: number; failed: number; evicted: number } | null> {
  const native = nativePlugin();
  if (!native) return null;
  let handle: PluginListenerHandle | null = null;
  try {
    handle = await native.addListener("downloadProgress", ({ done, total }) => onProgress(done, total));
    return await native.download({ urls, maxBytes: NATIVE_RECITATION_MAX_BYTES, title });
  } catch {
    return null;
  } finally {
    void handle?.remove().catch(() => {});
  }
}

/**
 * The native queue for what the Mushaf asked to play.
 *
 *   - repeat a verse N times: the verse N times in a row (endless: repeat one)
 *   - loop a range of verses: the range, repeated
 *   - otherwise: from the chosen verse to the end of the list
 */
export function planRecitationQueue<T>(options: {
  items: readonly T[];
  currentIndex: number;
  loop: boolean;
  loopCount: number;
  useRange: boolean;
  rangeStartIdx: number;
  rangeEndIdx: number;
  advance: boolean;
}): { items: T[]; startIndex: number; repeat: RecitationRepeat } {
  const { items, currentIndex } = options;
  const current = items[currentIndex];
  if (current === undefined) return { items: [], startIndex: 0, repeat: "none" };
  if (options.loop) {
    if (options.loopCount === -1) return { items: [current], startIndex: 0, repeat: "one" };
    const times = Math.max(1, Math.min(99, Math.trunc(options.loopCount)));
    return { items: Array.from({ length: times }, () => current), startIndex: 0, repeat: "none" };
  }
  if (options.advance && options.useRange) {
    const start = Math.max(0, Math.min(options.rangeStartIdx, items.length - 1));
    const end = Math.max(start, Math.min(options.rangeEndIdx, items.length - 1));
    const range = items.slice(start, end + 1);
    const inRange = currentIndex >= start && currentIndex <= end;
    return { items: range, startIndex: inRange ? currentIndex - start : 0, repeat: "all" };
  }
  if (options.advance) return { items: items.slice(currentIndex), startIndex: 0, repeat: "none" };
  return { items: [current], startIndex: 0, repeat: "none" };
}

/** Space taken by recitations saved for offline listening, or null outside the apps. */
export async function downloadedRecitationBytes(): Promise<number | null> {
  const native = nativePlugin();
  if (!native) return null;
  try {
    const { bytes } = await native.downloadedBytes();
    return Number.isFinite(bytes) && bytes >= 0 ? bytes : 0;
  } catch {
    return null;
  }
}

/** Delete every recitation saved for offline listening. */
export async function clearDownloadedRecitations(): Promise<boolean> {
  const native = nativePlugin();
  if (!native) return false;
  try {
    await native.clearDownloads();
    return true;
  } catch {
    return false;
  }
}
