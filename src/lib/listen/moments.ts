/**
 * Listening for the moments of the day and the week, each from the Sunnah or
 * the habits of Muslims, played in a variety of voices.
 */
import { findMoshaf, findReciter, parseSurahList, surahTrack, type ListenCatalog, type ListenTrack } from "@/lib/listen/catalog";

export type Moment = {
  id: string;
  title: string;
  subtitle: string;
  surahs: number[];
  /** Colours of the card. */
  from: string;
  to: string;
};

export const MOMENTS: Moment[] = [
  { id: "kahf", title: "الكهف يوم الجمعة", subtitle: "نورٌ لك ما بين الجمعتين", surahs: [18], from: "#2f5d50", to: "#0d2420" },
  { id: "sleep", title: "قبل النوم", subtitle: "كان ﷺ لا ينام حتى يقرأ الملك والسجدة", surahs: [67, 32, 17, 39], from: "#24315e", to: "#090d22" },
  { id: "zahrawan", title: "الزهراوان", subtitle: "البقرة وآل عمران، تأتيان يوم القيامة تُحاجّان عن صاحبهما", surahs: [2, 3], from: "#6b4a1c", to: "#26160a" },
  { id: "hearts", title: "تلين لها القلوب", subtitle: "يس والرحمن والواقعة والملك", surahs: [36, 55, 56, 67], from: "#5c2a4a", to: "#1f0c19" },
  { id: "amma", title: "جزء عمّ", subtitle: "لحفظ الصغار ومراجعة الكبار", surahs: Array.from({ length: 37 }, (_, i) => 78 + i), from: "#1f5a6b", to: "#08202a" },
  { id: "ruqya", title: "الرقية", subtitle: "الفاتحة والبقرة والمعوّذات", surahs: [1, 2, 112, 113, 114], from: "#3b4a2a", to: "#12180b" },
];

/** Alafasy (Hafs, murattal) until you choose a reciter of your own. */
export const DEFAULT_VOICE = { reciterId: 123, moshafId: 123 };

export function voiceFor(catalog: ListenCatalog, preferred: { reciterId: number; moshafId: number } | null) {
  const pick = preferred ?? DEFAULT_VOICE;
  const found = findMoshaf(catalog, pick.moshafId);
  if (found) return found;
  const reciter = findReciter(catalog, DEFAULT_VOICE.reciterId) ?? catalog.reciters[0]!;
  return { reciter, moshaf: reciter.m[0]! };
}

export function momentTracks(catalog: ListenCatalog, moment: Moment, _preferred: { reciterId: number; moshafId: number } | null = null): ListenTrack[] {
  const candidates = catalog.reciters.flatMap((reciter) => reciter.m
    .filter((moshaf) => moshaf.r === "حفص عن عاصم" && moshaf.s === "مرتّل")
    .map((moshaf) => ({ reciter, moshaf, surahs: new Set(parseSurahList(moshaf.l)) })));
  let previous: number | undefined;
  return moment.surahs.flatMap((surah) => {
    const available = candidates.filter((entry) => entry.surahs.has(surah));
    const different = available.filter((entry) => entry.reciter.id !== previous);
    const choices = different.length ? different : available;
    if (!choices.length) return [];
    const chosen = choices[Math.floor(Math.random() * choices.length)]!;
    previous = chosen.reciter.id;
    return [surahTrack(chosen.reciter, chosen.moshaf, surah)];
  });
}

/** Friday from sunset Thursday to sunset Friday is roughly Thursday evening and Friday. */
export function isKahfTime(now = new Date()): boolean {
  const day = now.getDay();
  return day === 5 || (day === 4 && now.getHours() >= 18);
}
