/**
 * «القرآن ٢» — the reader's player: one audio element playing a whole surah,
 * with the reciter's word timings telling which word is being said.
 *
 * The current word does not go through React state: the reader's text can be
 * thousands of words, so the highlight is moved on the DOM directly (onWord),
 * and React only hears when the ayah changes.
 */
import * as React from "react";
import { locate, wordSpan, type Q2SurahTiming } from "../data/timings";

export type RepeatMode = 0 | 3 | -1; // off، three times، until stopped

export type PlayerView = {
  playing: boolean;
  waiting: boolean;
  ayah: number | null;
  rate: number;
  repeat: RepeatMode;
  error: boolean;
};

export function useQ2Player(options: {
  timing: Q2SurahTiming | undefined;
  title: string;
  artist: string;
  onWord: (ayah: number | null, word: number | null) => void;
}) {
  const { timing, title, artist, onWord } = options;
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const frame = React.useRef(0);
  const stopAt = React.useRef<number | null>(null);
  const repeatLeft = React.useRef<{ ayah: number; left: number } | null>(null);
  const last = React.useRef<{ a: number | null; w: number | null }>({ a: null, w: null });
  const onWordRef = React.useRef(onWord);
  const timingRef = React.useRef(timing);
  const [view, setView] = React.useState<PlayerView>({ playing: false, waiting: false, ayah: null, rate: 1, repeat: 0, error: false });
  const viewRef = React.useRef(view);
  React.useLayoutEffect(() => {
    onWordRef.current = onWord;
    timingRef.current = timing;
    viewRef.current = view;
  });
  const [progress, setProgress] = React.useState(0);

  const getAudio = React.useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "none";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  React.useEffect(() => {
    if (!timing) return;
    const audio = getAudio();
    if (audio.src !== timing.audioUrl) {
      audio.pause();
      audio.src = timing.audioUrl;
    }
  }, [timing, getAudio]);

  const tick = React.useCallback(() => {
    const audio = audioRef.current;
    const t = timingRef.current;
    if (!audio || !t) return;
    const ms = audio.currentTime * 1000;
    if (stopAt.current != null && ms >= stopAt.current) {
      // A single word was asked for: stop on it, with it still marked.
      stopAt.current = null;
      audio.pause();
      return;
    }
    const rep = repeatLeft.current;
    if (rep) {
      const verse = t.verses.find((v) => v.a === rep.ayah);
      if (verse && ms >= verse.to - 40) {
        if (rep.left !== 0) {
          if (rep.left > 0) rep.left -= 1;
          audio.currentTime = verse.from / 1000;
          return;
        }
        repeatLeft.current = null;
      }
    }
    const where = locate(t, ms);
    const a = where?.a ?? last.current.a;
    const w = where?.w ?? null;
    if (a !== last.current.a || w !== last.current.w) {
      const ayahChanged = a !== last.current.a;
      last.current = { a, w };
      onWordRef.current(a, w);
      if (ayahChanged) {
        setView((v) => ({ ...v, ayah: a }));
        const mode = viewRef.current.repeat;
        if (a != null && mode !== 0 && repeatLeft.current?.ayah !== a) repeatLeft.current = { ayah: a, left: mode === -1 ? -1 : mode - 1 };
      }
    }
    setProgress(t.durationMs ? ms / t.durationMs : 0);
  }, []);

  React.useEffect(() => {
    const audio = getAudio();
    const loop = () => {
      tick();
      frame.current = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      setView((v) => ({ ...v, playing: true, error: false }));
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(loop);
    };
    const onPause = () => {
      setView((v) => ({ ...v, playing: false, waiting: false }));
      cancelAnimationFrame(frame.current);
      tick();
    };
    const onWaiting = () => setView((v) => ({ ...v, waiting: true }));
    const onPlaying = () => setView((v) => ({ ...v, waiting: false }));
    const onError = () => setView((v) => ({ ...v, playing: false, waiting: false, error: true }));
    const onEnded = () => {
      last.current = { a: null, w: null };
      onWordRef.current(null, null);
      setView((v) => ({ ...v, ayah: null }));
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      cancelAnimationFrame(frame.current);
    };
  }, [getAudio, tick]);

  // Leaving the reader stops the recitation.
  React.useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current?.removeAttribute("src");
  }, []);

  React.useEffect(() => {
    if (!("mediaSession" in navigator) || !view.playing) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: "القرآن ٢ — أثر" });
    } catch {
      // Not supported here.
    }
  }, [title, artist, view.playing]);

  const start = React.useCallback(async (fromMs?: number) => {
    const audio = getAudio();
    const t = timingRef.current;
    if (!t) return;
    if (audio.src !== t.audioUrl) audio.src = t.audioUrl;
    if (fromMs != null) audio.currentTime = fromMs / 1000;
    audio.playbackRate = viewRef.current.rate;
    try {
      await audio.play();
    } catch {
      setView((v) => ({ ...v, error: true }));
    }
  }, [getAudio]);

  const api = React.useMemo(() => ({
    toggle() {
      const audio = getAudio();
      if (!audio.paused) audio.pause();
      else void start();
    },
    playFrom(ayah: number) {
      const verse = timingRef.current?.verses.find((v) => v.a === ayah);
      stopAt.current = null;
      repeatLeft.current = null;
      if (verse) void start(verse.from);
    },
    /** Say one word in the reciter's voice, then stop. */
    playWord(ayah: number, word: number) {
      const t = timingRef.current;
      const span = t ? wordSpan(t, ayah, word) : null;
      if (!span) return false;
      repeatLeft.current = null;
      stopAt.current = span[1] + 60;
      void start(Math.max(0, span[0] - 20));
      return true;
    },
    step(delta: 1 | -1) {
      const t = timingRef.current;
      const current = last.current.a ?? viewRef.current.ayah ?? 0;
      const target = t?.verses.find((v) => v.a === current + delta);
      if (target) {
        repeatLeft.current = null;
        void start(target.from);
      }
    },
    setRate(rate: number) {
      getAudio().playbackRate = rate;
      setView((v) => ({ ...v, rate }));
    },
    setRepeat(repeat: RepeatMode) {
      repeatLeft.current = null;
      setView((v) => ({ ...v, repeat }));
      const a = last.current.a;
      if (a != null && repeat !== 0) repeatLeft.current = { ayah: a, left: repeat === -1 ? -1 : repeat - 1 };
    },
    pause() {
      audioRef.current?.pause();
    },
  }), [getAudio, start]);

  return { view, progress, ...api };
}
