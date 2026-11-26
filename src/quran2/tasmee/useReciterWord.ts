/**
 * «القرآن الكريم» — hear one word, or one ayah, in the reciter's own voice: the surah's
 * recitation is played from the word's start to its end (the reciter's word
 * timings, data/timings.ts). One audio element serves every word.
 */
import * as React from "react";
import { loadSurahTiming, wordSpan, type Q2SurahTiming } from "../data/timings";

export function useReciterWord(reciter: number) {
  const audio = React.useRef<HTMLAudioElement | null>(null);
  const stopAt = React.useRef<number | null>(null);
  const [playing, setPlaying] = React.useState<string | null>(null);

  React.useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    const onTime = () => {
      if (stopAt.current != null && el.currentTime * 1000 >= stopAt.current) {
        el.pause();
        stopAt.current = null;
      }
    };
    const onPause = () => setPlaying(null);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    audio.current = el;
    return () => {
      el.pause();
      el.removeAttribute("src");
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
    };
  }, []);

  const playRange = React.useCallback(async (key: string, timing: Q2SurahTiming, from: number, to: number) => {
    const el = audio.current;
    if (!el) return false;
    if (el.src !== timing.audioUrl) el.src = timing.audioUrl;
    el.currentTime = Math.max(0, from - 30) / 1000;
    stopAt.current = to + 80;
    setPlaying(key);
    try {
      await el.play();
      return true;
    } catch {
      setPlaying(null);
      return false;
    }
  }, []);

  /** Say word `w` of ayah `s:a`. False when this reciter has no timing for it. */
  const playWord = React.useCallback(async (s: number, a: number, w: number) => {
    const timing = await loadSurahTiming(reciter, s).catch(() => null);
    const span = timing ? wordSpan(timing, a, w) : null;
    if (!timing || !span) return false;
    return playRange(`${s}:${a}:${w}`, timing, span[0], span[1]);
  }, [reciter, playRange]);

  /** Recite ayah `s:a`. */
  const playAyah = React.useCallback(async (s: number, a: number) => {
    const timing = await loadSurahTiming(reciter, s).catch(() => null);
    const verse = timing?.verses.find((v) => v.a === a);
    if (!timing || !verse) return false;
    return playRange(`${s}:${a}`, timing, verse.from, verse.to);
  }, [reciter, playRange]);

  const stop = React.useCallback(() => audio.current?.pause(), []);

  return { playWord, playAyah, stop, playing };
}
