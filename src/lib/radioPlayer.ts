/**
 * radioPlayer.ts — module-level singleton so audio persists across page navigation
 */

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
}

function _resetAudio() {
  _clearStartTimer();
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

export function playRadio(idx: number, triedStations = new Set<number>()) {
  const stationIdx = _normalizeStationIndex(idx);
  const station = QURAN_RADIO_STATIONS[stationIdx];
  if (!station) return;

  _stationIdx = stationIdx;
  triedStations.add(stationIdx);
  const playToken = ++_playToken;
  _resetAudio();

  _audio = new Audio(station.url);
  _audio.preload = "none";
  _audio.setAttribute("playsinline", "true");
  _loading = true;
  _playing = true;
  _notify();

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
}

export function toggleRadio() {
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
