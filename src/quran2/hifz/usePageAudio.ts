/**
 * «القرآن ٢» — a page recited from first ayah to last, again and again if
 * asked: the reciter's voice to learn and revise a page by.
 */
import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { loadSurahTiming, type Q2SurahTiming } from "../data/timings";
import type { PageAyah } from "../data/pages";

type Part = { url: string; from: number; to: number };

export function pagePlan(ayahs: PageAyah[], timings: Map<number, Q2SurahTiming>): Part[] | null {
  const parts: Part[] = [];
  for (const { ayah } of ayahs) {
    const t = timings.get(ayah.s);
    const v = t?.verses.find((x) => x.a === ayah.a);
    if (!t || !v) return null;
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.url === t.audioUrl && Math.abs(lastPart.to - v.from) < 1500) lastPart.to = v.to;
    else parts.push({ url: t.audioUrl, from: v.from, to: v.to });
  }
  return parts;
}

export function usePageAudio(ayahs: PageAyah[], reciter: number) {
  const surahs = React.useMemo(() => [...new Set(ayahs.map((x) => x.ayah.s))], [ayahs]);
  const queries = useQueries({
    queries: surahs.map((s) => ({
      queryKey: ["q2", "timing", reciter, s],
      queryFn: () => loadSurahTiming(reciter, s),
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  });
  const ready = queries.every((q) => q.data);
  const timings = React.useMemo(() => {
    const map = new Map<number, Q2SurahTiming>();
    queries.forEach((q, i) => q.data && map.set(surahs[i]!, q.data));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, surahs]);
  const plan = React.useMemo(() => (ready ? pagePlan(ayahs, timings) : null), [ready, ayahs, timings]);

  const planRef = React.useRef(plan);
  const cursor = React.useRef({ part: 0, loop: false });
  const startRef = React.useRef<(part: number) => void>(() => {});
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [loop, setLoopState] = React.useState(false);

  React.useLayoutEffect(() => {
    planRef.current = plan;
  }, [plan]);

  // One audio element for the page; when a part ends, the next one starts.
  React.useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const start = (part: number) => {
      const p = planRef.current?.[part];
      if (!p) return;
      cursor.current.part = part;
      if (audio.src !== p.url) audio.src = p.url;
      audio.currentTime = p.from / 1000;
      void audio.play().catch(() => setPlaying(false));
    };
    startRef.current = start;
    const onTime = () => {
      const p = planRef.current?.[cursor.current.part];
      if (!p || audio.currentTime * 1000 < p.to) return;
      const next = cursor.current.part + 1;
      if (planRef.current?.[next]) start(next);
      else if (cursor.current.loop) start(0);
      else audio.pause();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, []);

  return {
    ready: Boolean(plan),
    failed: queries.some((q) => q.isError),
    playing,
    loop,
    toggle() {
      if (playing) audioRef.current?.pause();
      else startRef.current(0);
    },
    setLoop(next: boolean) {
      cursor.current.loop = next;
      setLoopState(next);
    },
  };
}
