/**
 * The player of «السماع»: whole surahs, night prayers and tawasheeh.
 *
 * One player for the whole app, kept outside React so it carries on between
 * pages. In the Android and iOS apps it hands the queue to the native player
 * (QuranAudioPlugin), which keeps playing with the phone locked and shows the
 * system's own controls; in the browser it uses an audio element and the
 * Media Session API.
 *
 * It also keeps your listening: where you stopped in each track (to resume),
 * minutes per day, surahs heard to the end (the listening khatma) and time per
 * reciter (see store.ts).
 */
import type { ListenTrack } from "@/lib/listen/catalog";
import { useListenStore } from "@/lib/listen/store";
import { claimAudioFocus } from "@/lib/audioFocus";
import { claimMediaSession, releaseMediaSession, setMediaPlaybackState, updateNowPlaying } from "@/lib/mediaSession";
import {
  hasNativeRecitation,
  nativePlaybackPosition,
  nativeSeek,
  startNativeRecitation,
  type NativeRecitationSession,
} from "@/lib/nativeRecitation";

export type RepeatMode = "off" | "all" | "one";
export type SleepTimer = { mode: "off" } | { mode: "time"; endsAt: number; minutes: number } | { mode: "track" };
export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type ListenPlayerState = {
  queue: ListenTrack[];
  index: number;
  current: ListenTrack | null;
  status: PlayerStatus;
  positionMs: number;
  durationMs: number;
  rate: number;
  repeat: RepeatMode;
  shuffle: boolean;
  sleep: SleepTimer;
  /** Seeking works (always on the web; on apps once the native player supports it). */
  canSeek: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();
let state: ListenPlayerState = {
  queue: [],
  index: -1,
  current: null,
  status: "idle",
  positionMs: 0,
  durationMs: 0,
  rate: 1,
  repeat: "off",
  shuffle: false,
  sleep: { mode: "off" },
  canSeek: !hasNativeRecitation(),
  error: null,
};

function setState(patch: Partial<ListenPlayerState>) {
  state = { ...state, ...patch };
  state.current = state.queue[state.index] ?? null;
  for (const fn of listeners) fn();
}

export function getListenState(): ListenPlayerState {
  return state;
}

export function subscribeListen(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─────────────── Keeping your listening ───────────────

let creditMs = 0;
let trackHeardMs = 0;
let lastPos = -1;
let lastSavedAt = 0;
let completedId: string | null = null;

function flushCredit() {
  const track = state.current;
  if (track && creditMs >= 1000) {
    useListenStore.getState().addListened(track, Math.round(creditMs / 1000));
    creditMs = 0;
  }
}

function saveProgress(force = false) {
  const track = state.current;
  if (!track) return;
  const now = Date.now();
  if (!force && now - lastSavedAt < 10_000) return;
  lastSavedAt = now;
  useListenStore.getState().recordProgress(track, state.positionMs, state.durationMs);
}

function checkCompleted() {
  const track = state.current;
  if (!track || completedId === track.id) return;
  const duration = state.durationMs || (track.durationS ?? 0) * 1000;
  if (!duration) return;
  // Heard to the end: at least 85% of it actually listened, and reached the last seconds.
  if (state.positionMs >= duration - 4000 && trackHeardMs >= duration * 0.85) {
    completedId = track.id;
    useListenStore.getState().markCompleted(track);
  }
}

/** A new position from the player: credit the time actually listened. */
function onPosition(positionMs: number, durationMs: number) {
  if (lastPos >= 0) {
    const delta = positionMs - lastPos;
    // Only steady playback counts (not a seek, which jumps).
    if (delta > 0 && delta < 4000) {
      creditMs += delta / Math.max(0.5, state.rate);
      trackHeardMs += delta;
    }
  }
  lastPos = positionMs;
  setState({ positionMs, durationMs: durationMs || state.durationMs });
  if (creditMs >= 15_000) flushCredit();
  saveProgress();
  checkCompleted();
  checkSleep();
}

function trackChanged() {
  flushCredit();
  saveProgress(true);
  lastPos = -1;
  trackHeardMs = 0;
  completedId = null;
}

// ─────────────── Sleep timer ───────────────

let sleepTimer: ReturnType<typeof setTimeout> | null = null;

function checkSleep() {
  const sleep = state.sleep;
  if (sleep.mode === "time") {
    const left = sleep.endsAt - Date.now();
    if (left <= 0) {
      setState({ sleep: { mode: "off" } });
      pauseListen();
      setVolume(1);
    } else if (left < 12_000) {
      setVolume(Math.max(0.05, left / 12_000)); // a gentle fade before sleep
    }
  } else if (sleep.mode === "track" && state.durationMs && state.positionMs >= state.durationMs - 600) {
    setState({ sleep: { mode: "off" } });
    pauseListen();
  }
}

export function setSleepTimer(minutes: number | "track" | 0) {
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = null;
  setVolume(1);
  if (minutes === 0) {
    setState({ sleep: { mode: "off" } });
    return;
  }
  if (minutes === "track") {
    setState({ sleep: { mode: "track" } });
    return;
  }
  const endsAt = Date.now() + minutes * 60_000;
  setState({ sleep: { mode: "time", endsAt, minutes } });
  // Backstop for when no position updates arrive (the screen is off on the web).
  sleepTimer = setTimeout(() => checkSleep(), minutes * 60_000 + 500);
}

// ─────────────── Engines ───────────────

let audio: HTMLAudioElement | null = null;
let native: NativeRecitationSession | null = null;
let poller: ReturnType<typeof setInterval> | null = null;
let token = 0;
let volume = 1;
/** Bumped whenever the queue's order or contents change. */
let queueVersion = 0;
/** The queue version the native player was given. */
let nativeVersion = -1;

function setVolume(v: number) {
  volume = v;
  if (audio) audio.volume = v;
  if (native) native.volume = v;
}

function webAudio(): HTMLAudioElement {
  if (audio) return audio;
  const el = new Audio();
  el.preload = "auto";
  el.addEventListener("timeupdate", () => onPosition(el.currentTime * 1000, Number.isFinite(el.duration) ? el.duration * 1000 : 0));
  el.addEventListener("loadedmetadata", () => setState({ durationMs: Number.isFinite(el.duration) ? el.duration * 1000 : 0 }));
  el.addEventListener("playing", () => {
    setState({ status: "playing", error: null });
    void setMediaPlaybackState("listen", "playing");
  });
  el.addEventListener("waiting", () => setState({ status: "loading" }));
  el.addEventListener("pause", () => {
    if (state.status !== "idle" && !el.ended) {
      setState({ status: "paused" });
      flushCredit();
      saveProgress(true);
      void setMediaPlaybackState("listen", "paused");
    }
  });
  el.addEventListener("ended", () => {
    onPosition(el.duration * 1000, el.duration * 1000);
    advance(true);
  });
  el.addEventListener("error", () => failed());
  audio = el;
  return el;
}

function stopPolling() {
  if (poller) clearInterval(poller);
  poller = null;
}

function startPolling() {
  stopPolling();
  poller = setInterval(async () => {
    const pos = await nativePlaybackPosition();
    if (!pos) {
      if (state.canSeek) setState({ canSeek: false });
      return;
    }
    if (!state.canSeek) setState({ canSeek: true });
    if (pos.index >= 0 && pos.index !== state.index && pos.index < state.queue.length) {
      trackChanged();
      setState({ index: pos.index, positionMs: 0, durationMs: 0 });
    }
    if (pos.index >= 0) onPosition(pos.positionMs, pos.durationMs);
  }, 500);
}

function nativeRepeat(): "none" | "one" | "all" {
  return state.repeat === "one" ? "one" : state.repeat === "all" ? "all" : "none";
}

async function startNative(startIndex: number, startPositionMs: number, myToken: number) {
  const session = await startNativeRecitation(
    {
      verses: state.queue.map((t) => ({ id: t.id, url: t.url, title: t.title, artist: t.artist, album: t.album })),
      startIndex,
      rate: state.rate,
      volume,
      repeat: nativeRepeat(),
      startPositionMs,
    },
    {
      onVerse(index) {
        if (myToken !== token) return;
        if (index !== state.index) {
          trackChanged();
          if (state.sleep.mode === "track") {
            setState({ sleep: { mode: "off" } });
            pauseListen();
          }
          setState({ index, positionMs: 0, durationMs: 0 });
        }
      },
      onState(s) {
        if (myToken !== token) return;
        if (s === "playing") setState({ status: "playing", error: null });
        else if (s === "buffering") setState({ status: "loading" });
        else if (s === "paused") {
          setState({ status: "paused" });
          flushCredit();
          saveProgress(true);
        }
      },
      onEnded() {
        if (myToken !== token) return;
        checkCompleted();
        trackChanged();
        native = null;
        stopPolling();
        setState({ status: "idle" });
      },
      onError() {
        if (myToken !== token) return;
        failed();
      },
      onInterrupted() {
        if (myToken !== token) return;
        // The radio or the Mushaf took the player: stop here, ready to resume.
        trackChanged();
        native = null;
        stopPolling();
        setState({ status: "paused" });
      },
    },
  );
  if (myToken !== token) {
    session?.pause();
    return false;
  }
  if (!session) return false;
  native = session;
  nativeVersion = queueVersion;
  startPolling();
  return true;
}

function claimControls() {
  const track = state.current;
  if (!track || hasNativeRecitation()) return;
  void claimMediaSession(
    "listen",
    { title: track.title, artist: track.artist, album: track.album },
    {
      play: () => resumeListen(),
      pause: () => pauseListen(),
      stop: () => stopListen(),
      nexttrack: () => nextTrack(),
      previoustrack: () => previousTrack(),
    },
  );
}

async function load(index: number, startPositionMs = 0) {
  const myToken = ++token;
  const track = state.queue[index];
  if (!track) return;
  claimAudioFocus("listen", pauseListen);
  trackChanged();
  setState({ index, status: "loading", positionMs: startPositionMs, durationMs: (track.durationS ?? 0) * 1000, error: null });

  if (hasNativeRecitation()) {
    if (native && nativeVersion === queueVersion) {
      // Same queue already in the native player: just move within it.
      const moved = await nativeSeek(startPositionMs, index);
      if (moved && myToken === token) {
        native.resume();
        return;
      }
      native.pause();
      native = null;
    } else if (native) {
      native.pause();
      native = null;
    }
    if (await startNative(index, startPositionMs, myToken)) return;
    if (myToken !== token) return;
  }

  const el = webAudio();
  el.src = track.url;
  el.playbackRate = state.rate;
  el.volume = volume;
  if (startPositionMs > 0) {
    const seekOnce = () => {
      el.currentTime = startPositionMs / 1000;
      el.removeEventListener("loadedmetadata", seekOnce);
    };
    el.addEventListener("loadedmetadata", seekOnce);
  }
  claimControls();
  try {
    await el.play();
  } catch {
    if (myToken === token) setState({ status: "paused" });
  }
}

let failures = 0;
function failed() {
  setState({ status: "error", error: "تعذّر تشغيل هذا المقطع؛ تحقّق من الاتصال" });
  failures++;
  // Skip a broken file, but do not run through the whole queue offline.
  if (failures < 3 && state.index < state.queue.length - 1) {
    setTimeout(() => {
      if (state.status === "error") void load(state.index + 1);
    }, 1500);
  }
}

function advance(ended: boolean) {
  if (ended) checkCompleted();
  failures = 0;
  if (state.sleep.mode === "track") {
    setState({ sleep: { mode: "off" }, status: "paused" });
    trackChanged();
    return;
  }
  if (state.repeat === "one") {
    void load(state.index);
    return;
  }
  const next = state.index + 1;
  if (next < state.queue.length) void load(next);
  else if (state.repeat === "all" && state.queue.length) void load(0);
  else {
    trackChanged();
    setState({ status: "idle", positionMs: 0 });
    void releaseMediaSession("listen");
  }
}

// ─────────────── Public controls ───────────────

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Play a list of tracks from `startIndex` (resuming a track where you left it when asked). */
export function playTracks(tracks: ListenTrack[], startIndex = 0, options: { resume?: boolean; shuffle?: boolean } = {}) {
  if (!tracks.length) return;
  let queue = tracks;
  let index = Math.max(0, Math.min(tracks.length - 1, startIndex));
  if (options.shuffle) {
    const first = tracks[index]!;
    queue = [first, ...shuffled(tracks.filter((_, i) => i !== index))];
    index = 0;
  }
  if (native) {
    native.pause();
    native = null;
    stopPolling();
  }
  const rate = useListenStore.getState().rate;
  queueVersion++;
  setState({ queue, index, shuffle: Boolean(options.shuffle), rate });
  let start = 0;
  if (options.resume) {
    const saved = useListenStore.getState().history.find((h) => h.track.id === queue[index]!.id);
    if (saved && saved.positionMs > 20_000 && (!saved.durationMs || saved.positionMs < saved.durationMs - 15_000)) start = saved.positionMs;
  }
  void load(index, start);
}

export function playTrack(track: ListenTrack, options: { resume?: boolean } = {}) {
  playTracks([track], 0, options);
}

export function pauseListen() {
  if (native) {
    native.pause();
    native = null;
    stopPolling();
    trackChanged();
    setState({ status: "paused" });
    return;
  }
  audio?.pause();
}

export function resumeListen() {
  if (!state.current) return;
  if (audio && !hasNativeRecitation() && audio.src) {
    claimAudioFocus("listen", pauseListen);
    claimControls();
    void audio.play().catch(() => setState({ status: "paused" }));
    return;
  }
  void load(state.index, state.positionMs);
}

export function toggleListen() {
  if (state.status === "playing" || state.status === "loading") pauseListen();
  else resumeListen();
}

export function stopListen() {
  token++;
  trackChanged();
  if (native) {
    native.pause();
    native = null;
  }
  stopPolling();
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  setSleepTimer(0);
  setState({ queue: [], index: -1, status: "idle", positionMs: 0, durationMs: 0, error: null });
  void releaseMediaSession("listen");
}

export function nextTrack() {
  if (state.index + 1 < state.queue.length) void load(state.index + 1);
  else if (state.repeat === "all" && state.queue.length) void load(0);
}

export function previousTrack() {
  // Like any player: back to the start first, then the previous track.
  if (state.positionMs > 4000 || state.index === 0) {
    seekTo(0);
    return;
  }
  void load(state.index - 1);
}

export function jumpTo(index: number) {
  if (index >= 0 && index < state.queue.length) void load(index);
}

export function seekTo(ms: number) {
  const target = Math.max(0, ms);
  lastPos = -1; // a seek is not listening
  if (native) {
    void nativeSeek(target).then((ok) => {
      if (!ok) setState({ canSeek: false });
    });
    setState({ positionMs: target });
    return;
  }
  if (audio) {
    audio.currentTime = target / 1000;
    setState({ positionMs: target });
  }
}

export function skipBy(seconds: number) {
  seekTo(state.positionMs + seconds * 1000);
}

export function setListenRate(rate: number) {
  const r = Math.max(0.5, Math.min(2, rate));
  useListenStore.getState().setRate(r);
  setState({ rate: r });
  native?.setRate(r);
  if (audio) audio.playbackRate = r;
}

export function cycleRepeat() {
  const next: RepeatMode = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  setState({ repeat: next });
  queueVersion++;
  // The native queue repeats on its own; restart it with the new mode where it is.
  if (native) void load(state.index, state.positionMs);
}

export function toggleShuffle() {
  if (!state.queue.length) return;
  const current = state.current;
  if (!current) return;
  const done = state.queue.slice(0, state.index);
  const upcoming = state.queue.slice(state.index + 1);
  const on = !state.shuffle;
  const reordered = on ? shuffled(upcoming) : [...upcoming].sort((a, b) => (a.surah ?? 0) - (b.surah ?? 0));
  queueVersion++;
  setState({ queue: [...done, current, ...reordered], shuffle: on });
  if (native) void load(state.index, state.positionMs);
}

/** Play `track` right after the current one. */
export function playNext(track: ListenTrack) {
  if (!state.current) {
    playTrack(track);
    return;
  }
  const queue = [...state.queue];
  queue.splice(state.index + 1, 0, track);
  queueVersion++;
  setState({ queue });
  if (native) void load(state.index, state.positionMs);
}

/** Add to the end of the queue. */
export function enqueue(track: ListenTrack) {
  if (!state.current) {
    playTrack(track);
    return;
  }
  queueVersion++;
  setState({ queue: [...state.queue, track] });
  if (native) void load(state.index, state.positionMs);
}

export function removeFromQueue(index: number) {
  if (index === state.index || index < 0 || index >= state.queue.length) return;
  const queue = state.queue.filter((_, i) => i !== index);
  queueVersion++;
  setState({ queue, index: index < state.index ? state.index - 1 : state.index });
  if (native) void load(state.index, state.positionMs);
}

if (typeof document !== "undefined") {
  // Keep the resume point when the app is put away.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flushCredit();
      saveProgress(true);
    }
  });
}

/** Keep the lock screen's title in step on the web when the queue moves on. */
let shownId: string | null = null;
subscribeListen(() => {
  const track = state.current;
  if (!track || hasNativeRecitation() || track.id === shownId) return;
  shownId = track.id;
  void updateNowPlaying("listen", { title: track.title, artist: track.artist, album: track.album });
});
