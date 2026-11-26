/**
 * «القرآن الكريم» — recitations whose every word is timed (Quran.com / QuranicAudio,
 * "qdc" chapter recitations). The timings number words as the Quranic Arabic
 * Corpus does, like the rest of the section.
 */
import { cached } from "./cache";

export type Q2Reciter = { id: number; name: string; style: string };

/** The recitations that carry word timings (api.qurancdn.com/api/qdc/audio/reciters). */
export const Q2_RECITERS: Q2Reciter[] = [
  { id: 7, name: "مشاري راشد العفاسي", style: "مرتّل" },
  { id: 6, name: "محمود خليل الحصري", style: "مرتّل" },
  { id: 12, name: "محمود خليل الحصري", style: "معلّم" },
  { id: 9, name: "محمد صديق المنشاوي", style: "مرتّل" },
  { id: 2, name: "عبد الباسط عبد الصمد", style: "مرتّل" },
  { id: 1, name: "عبد الباسط عبد الصمد", style: "مجوّد" },
  { id: 3, name: "عبد الرحمن السديس", style: "مرتّل" },
  { id: 10, name: "سعود الشريم", style: "مرتّل" },
  { id: 4, name: "أبو بكر الشاطري", style: "مرتّل" },
  { id: 5, name: "هاني الرفاعي", style: "مرتّل" },
  { id: 97, name: "ياسر الدوسري", style: "مرتّل" },
  { id: 161, name: "خليفة الطنيجي", style: "مرتّل" },
];

export type Q2VerseTiming = {
  a: number;
  from: number;
  to: number;
  /** [word number, start ms, end ms], in the order they are recited. */
  words: Array<[number, number, number]>;
};

export type Q2SurahTiming = { audioUrl: string; durationMs: number; verses: Q2VerseTiming[] };

type ApiFile = {
  audio_url: string;
  duration: number;
  verse_timings: Array<{ verse_key: string; timestamp_from: number; timestamp_to: number; segments: number[][] }>;
};

export function parseTimings(file: ApiFile): Q2SurahTiming {
  return {
    audioUrl: file.audio_url,
    durationMs: file.duration,
    verses: file.verse_timings.map((v) => ({
      a: Number(v.verse_key.split(":")[1]),
      from: v.timestamp_from,
      to: v.timestamp_to,
      words: v.segments.filter((g) => g.length === 3).map((g) => [g[0]!, g[1]!, g[2]!] as [number, number, number]),
    })),
  };
}

export function loadSurahTiming(reciter: number, surah: number): Promise<Q2SurahTiming> {
  return cached(`timing:${reciter}:${surah}`, async () => {
    const res = await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${reciter}/audio_files?chapter=${surah}&segments=true`);
    if (!res.ok) throw new Error(`timings: HTTP ${res.status}`);
    const body = (await res.json()) as { audio_files: ApiFile[] };
    const file = body.audio_files[0];
    if (!file) throw new Error("timings: no recitation");
    return parseTimings(file);
  });
}

/** The ayah and word being recited at a moment (ms), or null between them. */
export function locate(timing: Q2SurahTiming, ms: number): { a: number; w: number | null } | null {
  const verses = timing.verses;
  let lo = 0;
  let hi = verses.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (verses[mid]!.from <= ms) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found < 0) return null;
  const verse = verses[found]!;
  if (ms > verse.to) return null;
  let w: number | null = null;
  for (const [n, start, end] of verse.words) {
    if (ms >= start && ms < end) {
      w = n;
      break;
    }
    if (ms >= start) w = n;
  }
  return { a: verse.a, w };
}

/** When a word is said: [start, end] ms, or null if it is not timed. */
export function wordSpan(timing: Q2SurahTiming, a: number, w: number): [number, number] | null {
  const verse = timing.verses.find((v) => v.a === a);
  const hit = verse?.words.find(([n]) => n === w);
  return hit ? [hit[1], hit[2]] : null;
}
