/**
 * radioPlayer.ts — module-level singleton so audio persists across page navigation
 */

export const QURAN_RADIO_STATIONS: Array<{ label: string; url: string }> = [
  { label: "راديو القرآن الكريم",  url: "https://stream.radiojar.com/0tpy1h0kxtzuv" },
  { label: "مشاري العفاسي",        url: "https://backup.qurango.net/radio/mishary_alafasi" },
  { label: "سعد الغامدي",          url: "https://backup.qurango.net/radio/saad_alghamdi" },
  { label: "ياسر الدوسري",         url: "https://backup.qurango.net/radio/yasser_aldosari" },
  { label: "ماهر المعيقلي",        url: "https://backup.qurango.net/radio/maher" },
];

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

const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach((fn) => fn());
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

export function playRadio(idx: number) {
  _stationIdx = idx;
  if (_audio) {
    _audio.pause();
    _audio.src = "";
  }
  _audio = new Audio(QURAN_RADIO_STATIONS[idx].url);
  _audio.preload = "none";
  _loading = true;
  _playing = true;
  _notify();

  _audio.addEventListener("canplay", () => {
    _loading = false;
    _notify();
  }, { once: true });

  _audio.addEventListener("error", () => {
    _loading = false;
    _playing = false;
    _notify();
  }, { once: true });

  _audio.play().catch(() => {
    _loading = false;
    _playing = false;
    _notify();
  });
}

export function stopRadio() {
  if (_audio) {
    _audio.pause();
    _audio.src = "";
    _audio = null;
  }
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
