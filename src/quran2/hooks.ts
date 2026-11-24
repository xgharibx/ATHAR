import { useQuery } from "@tanstack/react-query";
import { loadQuran2Text } from "./data/text";
import { loadQuran2Meta } from "./data/meta";
import { loadMorphology } from "./data/morphology";
import { loadSurahTiming } from "./data/timings";
import { loadTafsir } from "./data/tafsir";

const forever = { staleTime: Infinity, gcTime: Infinity, retry: 1 } as const;

export function useQ2Text() {
  return useQuery({ queryKey: ["q2", "text"], queryFn: loadQuran2Text, ...forever });
}

export function useQ2Meta() {
  return useQuery({ queryKey: ["q2", "meta"], queryFn: loadQuran2Meta, ...forever });
}

/** The Corpus morphology: about 1 MB fetched once, then read from the device. */
export function useQ2Morph(enabled = true) {
  return useQuery({ queryKey: ["q2", "morph"], queryFn: loadMorphology, enabled, ...forever });
}

export function useQ2Timing(reciter: number, surah: number, enabled = true) {
  return useQuery({
    queryKey: ["q2", "timing", reciter, surah],
    queryFn: () => loadSurahTiming(reciter, surah),
    enabled,
    ...forever,
  });
}

export function useQ2Tafsir(id: number, s: number, a: number, enabled = true) {
  return useQuery({
    queryKey: ["q2", "tafsir", id, s, a],
    queryFn: () => loadTafsir(id, s, a),
    enabled,
    ...forever,
  });
}

/** Today as YYYY-MM-DD in local time. */
export function dayKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
