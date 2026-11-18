/**
 * radioPlayer.ts — module-level singleton so audio persists across page navigation.
 *
 * In the Android and iOS apps the radio plays in the same native player as
 * the Quran recitation (QuranAudioPlugin: Media3 on Android, AVPlayer on
 * iPhone), so it keeps playing with the phone locked or the app in the
 * background, and the lock screen, headphones, watch and car control it,
 * including next and previous station. Browsers, and app builds from before
 * this, use the web audio player.
 */
import { claimMediaSession, releaseMediaSession, setMediaPlaybackState } from "@/lib/mediaSession";
import { hasNativeRecitation, startNativeRecitation, type NativeRecitationSession } from "@/lib/nativeRecitation";

export const QURAN_RADIO_STATIONS: Array<{ label: string; url: string }> = [
  { label: "راديو القرآن الكريم",  url: "https://backup.qurango.net/radio/mishary_alafasi" },
  { label: "البث الاحتياطي",       url: "https://stream.radiojar.com/0tpy1h0kxtzuv" },
  { label: "سعد الغامدي",          url: "https://backup.qurango.net/radio/saad_alghamdi" },
  { label: "ياسر الدوسري",         url: "https://backup.qurango.net/radio/yasser_aldosari" },
  { label: "ماهر المعيقلي",        url: "https://backup.qurango.net/radio/maher" },
];

const RADIO_START_TIMEOUT_MS = 12000;

export type RadioState = {
  playing: boolean;
  loading: boolean;
  stationIdx: number;
  stations: typeof QURAN_RADIO_STATIONS;
};

let _audio: HTMLAudioElement | null = null;
let _native: NativeRecitationSession | null = null;
let _stationIdx = 0;
let _playing = false;
let _loading = false;
let _playToken = 0;
let _startTimer: ReturnType<typeof setTimeout> | null = null;

const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
}

function _clearStartTimer() {
  if (_startTimer) {
    clearTimeout(_startTimer);
    _startTimer = null;
  }
}

function _setReady(playToken: number) {
  if (playToken !== _playToken) return;
  _clearStartTimer();
  _loading = false;
  _playing = true;
  _notify();
  void setMediaPlaybackState("radio", "playing");
}

/** Lock-screen and notification controls for the station now playing. */
function _claimControls(stationIdx: number) {
  const station = QURAN_RADIO_STATIONS[stationIdx];
  if (!station) return;
  void claimMediaSession(
    "radio",
    { title: station.label, artist: "إذاعة القرآن الكريم", album: "أثر" },
    {
      play: () => playRadio(_stationIdx),
      pause: () => stopRadio(),
      stop: () => stopRadio(),
      nexttrack: () => playRadio((_stationIdx + 1) % QURAN_RADIO_STATIONS.length),
      previoustrack: () => playRadio((_stationIdx - 1 + QURAN_RADIO_STATIONS.length) % QURAN_RADIO_STATIONS.length),
    },
  );
}

function _resetAudio() {
  _clearStartTimer();
  if (_native) {
    const session = _native;
    _native = null;
    session.pause();
  }
  if (_audio) {
    _audio.pause();
    _audio.removeAttribute("src");
    _audio.load();
    _audio = null;
  }
}

function _normalizeStationIndex(idx: number) {
  return Math.max(0, Math.min(QURAN_RADIO_STATIONS.length - 1, idx));
}

function _nextUntriedStation(tried: Set<number>) {
  return QURAN_RADIO_STATIONS.findIndex((_, idx) => !tried.has(idx));
}

export function getRadioState(): RadioState {
  return {
    playing: _playing,
    loading: _loading,
    stationIdx: _stationIdx,
    stations: QURAN_RADIO_STATIONS,
  };
}

export function subscribeRadio(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** The stations as the native player's list, so next and previous change station. */
export function nativeRadioItems() {
  return QURAN_RADIO_STATIONS.map((station, index) => ({
    id: `radio:${index}`,
    url: station.url,
    title: station.label,
    artist: "إذاعة القرآن الكريم",
  }));
}

/** How long a station must have played before its stream ending is treated as a dropped connection. */
const RECONNECT_AFTER_MS = 30_000;

function _playNative(stationIdx: number, triedStations: Set<number>, playToken: number) {
  _loading = true;
  _playing = true;
  _notify();
  let readyAt = 0;
  let tried = triedStations;

  const failOrFallback = () => {
    if (playToken !== _playToken) return;
    const nextIdx = _nextUntriedStation(tried);
    if (nextIdx >= 0) {
      playRadio(nextIdx, new Set(tried));
      return;
    }
    stopRadio();
  };
  _startTimer = setTimeout(failOrFallback, RADIO_START_TIMEOUT_MS);

  void startNativeRecitation(
    { verses: nativeRadioItems(), startIndex: stationIdx, rate: 1, volume: 1, repeat: "all", live: true },
    {
      onVerse: (index) => {
        if (playToken !== _playToken || index === _stationIdx) return;
        // Next or previous station from the lock screen, headphones or car.
        _stationIdx = _normalizeStationIndex(index);
        tried = new Set([_stationIdx]);
        _notify();
      },
      onState: (state) => {
        if (playToken !== _playToken) return;
        if (state === "playing") {
          readyAt = Date.now();
          _clearStartTimer();
          _loading = false;
          _playing = true;
        } else if (state === "buffering") {
          _loading = true;
          _playing = true;
        } else {
          // Paused from the lock screen, headphones or a call.
          _loading = false;
          _playing = false;
        }
        _notify();
      },
      onEnded: () => {
        if (playToken !== _playToken) return;
        // A station that had been playing dropped its stream: reconnect to it.
        if (readyAt && Date.now() - readyAt > RECONNECT_AFTER_MS) playRadio(_stationIdx);
        else failOrFallback();
      },
      onError: () => failOrFallback(),
      onInterrupted: () => {
        if (playToken !== _playToken) return;
        // A Mushaf recitation took over the player.
        _playToken++;
        _native = null;
        _clearStartTimer();
        _loading = false;
        _playing = false;
        _notify();
      },
    },
  ).then((session) => {
    if (playToken !== _playToken) {
      session?.pause();
      return;
    }
    if (!session) {
      // An app build without the native player.
      _clearStartTimer();
      _playWeb(stationIdx, tried, playToken);
      return;
    }
    _native = session;
  });
}

export function playRadio(idx: number, triedStations = new Set<number>()) {
  const stationIdx = _normalizeStationIndex(idx);
  const station = QURAN_RADIO_STATIONS[stationIdx];
  if (!station) return;

  _stationIdx = stationIdx;
  triedStations.add(stationIdx);
  const playToken = ++_playToken;
  _resetAudio();

  if (hasNativeRecitation()) {
    // The native player shows its own lock-screen controls.
    void releaseMediaSession("radio");
    _playNative(stationIdx, triedStations, playToken);
    return;
  }
  _playWeb(stationIdx, triedStations, playToken);
}

function _playWeb(stationIdx: number, triedStations: Set<number>, playToken: number) {
  const station = QURAN_RADIO_STATIONS[stationIdx];
  if (!station) return;
  _audio = new Audio(station.url);
  _audio.preload = "none";
  _audio.setAttribute("playsinline", "true");
  _loading = true;
  _playing = true;
  _notify();
  _claimControls(stationIdx);

  const failOrFallback = () => {
    if (playToken !== _playToken) return;
    const nextIdx = _nextUntriedStation(triedStations);
    if (nextIdx >= 0) {
      playRadio(nextIdx, new Set(triedStations));
      return;
    }
    _clearStartTimer();
    _loading = false;
    _playing = false;
    _notify();
    void releaseMediaSession("radio");
  };

  _startTimer = setTimeout(failOrFallback, RADIO_START_TIMEOUT_MS);

  _audio.addEventListener("playing", () => _setReady(playToken), { once: true });
  _audio.addEventListener("canplay", () => _setReady(playToken), { once: true });
  _audio.addEventListener("loadeddata", () => _setReady(playToken), { once: true });

  _audio.addEventListener("error", failOrFallback, { once: true });

  _audio.play().then(() => _setReady(playToken)).catch(failOrFallback);
}

export function stopRadio() {
  _playToken++;
  _resetAudio();
  _playing = false;
  _loading = false;
  _notify();
  void releaseMediaSession("radio");
}

export function toggleRadio() {
  if (_native?.paused) {
    // Paused from the lock screen: carry on.
    _native.resume();
    return;
  }
  if (_playing) {
    stopRadio();
  } else {
    playRadio(_stationIdx);
  }
}

export function selectRadioStation(idx: number) {
  _stationIdx = idx;
  if (_playing) {
    playRadio(idx);
  } else {
    _notify();
  }
}
