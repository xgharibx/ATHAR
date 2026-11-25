/**
 * «القرآن ٢» — a page in the reciter's voice, two ways:
 *   continuous  the page from first ayah to last, again if asked;
 *   talqeen     each ayah, then a silence as long as the ayah for you to repeat
 *               it, so many times, then the next ayah: the way a teacher
 *               teaches a child, ayah by ayah.
 */
import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { loadSurahTiming, type Q2SurahTiming } from "../data/timings";
import type { PageAyah } from "../data/pages";

export type Part = { url: string; from: number; to: number; key: string };

/** The page's audio, ayah by ayah (merge: contiguous ayahs of one file joined). */
export function pagePlan(ayahs: PageAyah[], timings: Map<number, Q2SurahTiming>, merge = true): Part[] | null {
  const parts: Part[] = [];
  for (const { ayah } of ayahs) {
    const t = timings.get(ayah.s);
    const v = t?.verses.find((x) => x.a === ayah.a);
    if (!t || !v) return null;
    const lastPart = parts[parts.length - 1];
    if (merge && lastPart && lastPart.url === t.audioUrl && Math.abs(lastPart.to - v.from) < 1500) lastPart.to = v.to;
    else parts.push({ url: t.audioUrl, from: v.from, to: v.to, key: `${ayah.s}:${ayah.a}` });
  }
  return parts;
}

export type PagePhase = "idle" | "reciting" | "your-turn";

/** `follow`: play ayah by ayah and report the ayah being recited (for a page that lights it). */
export function usePageAudio(ayahs: PageAyah[], reciter: number, talqeenTimes = 3, follow = false) {
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
  const plans = React.useMemo(
    () => (ready ? { page: pagePlan(ayahs, timings, true), ayahs: pagePlan(ayahs, timings, false) } : null),
    [ready, ayahs, timings],
  );

  const plansRef = React.useRef(plans);
  const cfg = React.useRef({ loop: false, talqeen: false, times: talqeenTimes, follow });
  const cursor = React.useRef({ part: 0, rep: 0, gap: 0 as ReturnType<typeof setTimeout> | 0 });
  const api = React.useRef<{ start: (part: number) => void; stop: () => void }>({ start: () => {}, stop: () => {} });
  const [phase, setPhase] = React.useState<PagePhase>("idle");
  const [current, setCurrent] = React.useState<string | null>(null);
  const [loop, setLoopState] = React.useState(false);
  const [talqeen, setTalqeenState] = React.useState(false);

  React.useLayoutEffect(() => {
    plansRef.current = plans;
    cfg.current.times = talqeenTimes;
    cfg.current.follow = follow;
  }, [plans, talqeenTimes, follow]);

  React.useEffect(() => {
    const audio = new Audio();
    const plan = () => (cfg.current.talqeen || cfg.current.follow ? plansRef.current?.ayahs : plansRef.current?.page) ?? null;
    const clearGap = () => {
      if (cursor.current.gap) clearTimeout(cursor.current.gap);
      cursor.current.gap = 0;
    };
    const stop = () => {
      clearGap();
      audio.pause();
      setPhase("idle");
      setCurrent(null);
    };
    const start = (part: number) => {
      const p = plan()?.[part];
      if (!p) return stop();
      clearGap();
      cursor.current.part = part;
      if (audio.src !== p.url) audio.src = p.url;
      audio.currentTime = p.from / 1000;
      setPhase("reciting");
      setCurrent(cfg.current.talqeen || cfg.current.follow ? p.key : null);
      void audio.play().catch(stop);
    };
    api.current = { start, stop };
    const onTime = () => {
      const parts = plan();
      const p = parts?.[cursor.current.part];
      if (!parts || !p || audio.paused || audio.currentTime * 1000 < p.to) return;
      audio.pause();
      if (cfg.current.talqeen) {
        // Your turn: as long as the reciter took, and a little more.
        setPhase("your-turn");
        cursor.current.gap = setTimeout(() => {
          cursor.current.gap = 0;
          if (cursor.current.rep + 1 < cfg.current.times) {
            cursor.current.rep += 1;
            start(cursor.current.part);
          } else {
            cursor.current.rep = 0;
            const next = cursor.current.part + 1;
            if (parts[next]) start(next);
            else if (cfg.current.loop) start(0);
            else stop();
          }
        }, (p.to - p.from) * 1.1 + 700);
        return;
      }
      const next = cursor.current.part + 1;
      if (parts[next]) start(next);
      else if (cfg.current.loop) start(0);
      else stop();
    };
    audio.addEventListener("timeupdate", onTime);
    return () => {
      clearGap();
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
    };
  }, []);

  return {
    ready: Boolean(plans?.page),
    failed: queries.some((q) => q.isError),
    playing: phase !== "idle",
    phase,
    /** The ayah being taught ("s:a"), in talqeen. */
    current,
    loop,
    talqeen,
    toggle() {
      if (phase !== "idle") api.current.stop();
      else {
        cursor.current.rep = 0;
        api.current.start(0);
      }
    },
    setLoop(next: boolean) {
      cfg.current.loop = next;
      setLoopState(next);
    },
    setTalqeen(next: boolean) {
      api.current.stop();
      cfg.current.talqeen = next;
      setTalqeenState(next);
    },
  };
}
