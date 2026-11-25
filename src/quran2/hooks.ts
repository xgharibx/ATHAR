import { useQuery } from "@tanstack/react-query";
import { loadQuran2Text } from "./data/text";
import { loadQuran2Meta } from "./data/meta";
import { loadMorphology } from "./data/morphology";
import { loadSurahTiming } from "./data/timings";
import { loadTafsir } from "./data/tafsir";
import { buildSimilarIndex } from "./data/similar";
import { loadSurahTranslation } from "./data/translations";
import { loadWordMeanings } from "./data/wordMeanings";

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

/** The similar-ayah index, built on the device from the text (about a tenth of a second). */
export function useQ2Similar(enabled = true) {
  return useQuery({
    queryKey: ["q2", "similar"],
    queryFn: async () => buildSimilarIndex(await loadQuran2Text()),
    enabled,
    ...forever,
  });
}

export function useQ2Translation(id: number | null, s: number) {
  return useQuery({
    queryKey: ["q2", "translation", id, s],
    queryFn: () => loadSurahTranslation(id!, s),
    enabled: id != null,
    ...forever,
  });
}

/** A surah's word-by-word meanings in a language (needs the surah's word counts). */
export function useQ2WordMeanings(lang: string | null, s: number, wordCounts: number[] | undefined) {
  return useQuery({
    queryKey: ["q2", "wbw", lang, s],
    queryFn: () => loadWordMeanings(lang!, s, wordCounts!),
    enabled: lang != null && Boolean(wordCounts?.length),
    ...forever,
  });
}

/** Today as YYYY-MM-DD in local time. */
export function dayKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
