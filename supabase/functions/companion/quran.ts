import { skeleton, skeletonWithMap, toArabicDigits, toLatinDigits } from "./text.ts";

/**
 * The Quran text the assistant is allowed to show.
 *
 * The model never supplies the wording of a verse. It names a verse by
 * reference, or writes a quotation that is located in this corpus, and the
 * exact text is taken from here.
 */

export const SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس",
];

const BASMALA_SKELETON = skeleton("بسم الله الرحمن الرحيم");
/** A single passage longer than this is cut, so one reference cannot flood a reply. */
const MAX_PASSAGE_AYAHS = 8;
const MIN_QUOTE_SKELETON = 6;

type IndexedSurah = {
  ayahs: string[];
  /** Skeleton of the whole surah, ayahs joined without a separator. */
  text: string;
  /** For each skeleton letter: which ayah it is in, and where in that ayah. */
  ayahOf: number[];
  indexOf: number[];
};

export type QuranPassage = { surah: number; from: number; to: number; text: string };

export class QuranCorpus {
  private readonly surahs: IndexedSurah[];

  constructor(raw: unknown) {
    const list = (raw as { surahs?: unknown })?.surahs;
    if (!Array.isArray(list) || list.length !== 114) throw new Error("quran: unexpected data shape");
    this.surahs = list.map((entry, surahIndex) => {
      const source = (entry as { ayahs?: unknown }).ayahs;
      if (!Array.isArray(source) || source.length === 0) throw new Error("quran: surah without ayahs");
      const ayahs = source.map((ayah, ayahIndex) => {
        let value = String(ayah).replace(/\uFEFF/g, "").trim();
        // Every surah but the first carries the basmala in front of its first
        // ayah in this dataset; it is not part of that ayah.
        if (ayahIndex === 0 && surahIndex !== 0) {
          const words = value.split(/\s+/);
          if (words.length > 4 && skeleton(words.slice(0, 4).join(" ")) === BASMALA_SKELETON) {
            value = words.slice(4).join(" ");
          }
        }
        return value;
      });
      let text = "";
      const ayahOf: number[] = [];
      const indexOf: number[] = [];
      ayahs.forEach((ayah, ayahIndex) => {
        const part = skeletonWithMap(ayah);
        for (let i = 0; i < part.text.length; i += 1) {
          // Collapsing repeated letters must also hold across an ayah boundary.
          if (text.endsWith(part.text[i]!) && i === 0) continue;
          text += part.text[i];
          ayahOf.push(ayahIndex);
          indexOf.push(part.map[i]!);
        }
      });
      return { ayahs, text, ayahOf, indexOf };
    });
  }

  /** Text for a reference such as "2:255" or "2:255-257". */
  byReference(reference: string): QuranPassage | null {
    const match = /^\s*(\d{1,3})\s*[:：]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*$/.exec(toLatinDigits(reference));
    if (!match) return null;
    const surah = Number(match[1]);
    const from = Number(match[2]);
    let to = match[3] ? Number(match[3]) : from;
    const entry = this.surahs[surah - 1];
    if (!entry || from < 1 || from > entry.ayahs.length || to < from) return null;
    to = Math.min(to, entry.ayahs.length, from + MAX_PASSAGE_AYAHS - 1);
    return { surah, from, to, text: entry.ayahs.slice(from - 1, to).join(" ۝ ") };
  }

  /**
   * Locate a quotation and return the exact text it corresponds to. Whole
   * words are returned, so a partial quotation of a long ayah stays partial.
   */
  findQuote(quote: string): QuranPassage | null {
    const needle = skeleton(quote.replace(/[﴿﴾]/g, ""));
    if (needle.length < MIN_QUOTE_SKELETON) return null;
    for (let surahIndex = 0; surahIndex < this.surahs.length; surahIndex += 1) {
      const entry = this.surahs[surahIndex]!;
      const at = entry.text.indexOf(needle);
      if (at < 0) continue;
      const end = at + needle.length - 1;
      const firstAyah = entry.ayahOf[at]!;
      const lastAyah = Math.min(entry.ayahOf[end]!, firstAyah + MAX_PASSAGE_AYAHS - 1);
      const parts: string[] = [];
      for (let ayah = firstAyah; ayah <= lastAyah; ayah += 1) {
        const text = entry.ayahs[ayah]!;
        let start = ayah === firstAyah ? entry.indexOf[at]! : 0;
        let stop = ayah === entry.ayahOf[end]! ? entry.indexOf[end]! + 1 : text.length;
        while (start > 0 && !/\s/.test(text[start - 1]!)) start -= 1;
        while (stop < text.length && !/\s/.test(text[stop]!)) stop += 1;
        parts.push(text.slice(start, stop).trim());
      }
      return { surah: surahIndex + 1, from: firstAyah + 1, to: lastAyah + 1, text: parts.join(" ۝ ") };
    }
    return null;
  }
}

export function formatQuranPassage(passage: QuranPassage): string {
  const name = SURAH_NAMES[passage.surah - 1] ?? "";
  const range = passage.from === passage.to
    ? toArabicDigits(passage.from)
    : `${toArabicDigits(passage.from)}-${toArabicDigits(passage.to)}`;
  return `﴿${passage.text}﴾ — سورة ${name}: ${range}`;
}
