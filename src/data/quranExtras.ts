/**
 * Quran extras — translation + tafsir loaders, sajda/hizb metadata, surah
 * thematic info.
 *
 * Lazy-loaded on first use, cached in IndexedDB so subsequent navigations
 * to the Quran page are instant. The English Sahih bundle is 880 KB and the
 * Arabic Muyassar tafsir is 2.5 MB — keeping them out of the initial JS
 * bundle and out of the main Quran query means the Quran page stays fast.
 */
import { idbGetExtras, idbSetExtras } from "@/lib/quranIDB";

export type EnglishSahihAyah = [string, string]; // [arabic, english]
export type EnglishSahihDB = Record<string, EnglishSahihAyah>; // key: ayah number 1..6236

export type TafsirAyah = { surahId: number; ayahIndex: number; text: string };
export type TafsirDB = TafsirAyah[];

export type QuranExtras = {
  englishSahih: EnglishSahihDB | null;
  tafsir: TafsirDB | null;
};

const CACHE_VERSION = 2; // bump to invalidate when bundles change
const EXTRAS_KEY = `noor_quran_extras_v${CACHE_VERSION}`;

let _cache: QuranExtras | null = null;
let _promise: Promise<QuranExtras> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return (await r.json()) as T;
}

async function loadFromIDB(): Promise<QuranExtras | null> {
  try {
    const cached = await idbGetExtras<{ version: number; data: QuranExtras }>(EXTRAS_KEY);
    if (cached && cached.version === CACHE_VERSION) return cached.data;
  } catch { /* ignore */ }
  return null;
}

async function saveToIDB(extras: QuranExtras): Promise<void> {
  try {
    await idbSetExtras(EXTRAS_KEY, { version: CACHE_VERSION, data: extras });
  } catch { /* best-effort */ }
}

export async function loadQuranExtras(): Promise<QuranExtras> {
  if (_cache) return _cache;
  if (_promise) return _promise;
  _promise = (async () => {
    const cached = await loadFromIDB();
    if (cached) {
      _cache = cached;
      return cached;
    }
    const [englishSahih, tafsirRaw] = await Promise.all([
      fetchJson<EnglishSahihDB>("/data/quran-en-sahih.json").catch(() => null),
      fetchJson<{ surahs?: Array<{ id: number; name: string; verses?: Array<{ number: number; text: string }> }> }>(
        "/data/tafseer-muyassar.json",
      ).catch(() => null),
    ]);
    const tafsir: TafsirDB = [];
    if (tafsirRaw?.surahs) {
      for (const s of tafsirRaw.surahs) {
        for (const v of s.verses ?? []) {
          const text = String(v.text ?? "").trim();
          if (text.length < 20) continue;
          tafsir.push({ surahId: s.id, ayahIndex: v.number, text });
        }
      }
    }
    const result: QuranExtras = { englishSahih, tafsir };
    _cache = result;
    void saveToIDB(result);
    return result;
  })();
  return _promise;
}

/** Lookup helpers that work even before the bundle loads (return null). */
export function getEnglishText(extras: QuranExtras | null, globalAyah: number): string | null {
  if (!extras?.englishSahih) return null;
  const row = extras.englishSahih[String(globalAyah)];
  return row?.[1] ?? null;
}

/** Resolve (surahId, ayahIndex) → global ayah number (1..6236) for lookup. */
export function globalAyahNumber(surahId: number, ayahIndex: number): number {
  // Build a small offset table from canonical ayah counts.
  let running = 1;
  for (let i = 1; i < surahId; i++) running += SURAH_AYAH_COUNTS[i] ?? 0;
  return running + (ayahIndex - 1);
}

const SURAH_AYAH_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75, 9: 129, 10: 109,
  11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128, 17: 111, 18: 110, 19: 98, 20: 135,
  21: 112, 22: 78, 23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60,
  31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
  41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
  51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29, 58: 22, 59: 24, 60: 13,
  61: 14, 62: 11, 63: 11, 64: 18, 65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44,
  71: 28, 72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
  81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26, 89: 30, 90: 20,
  91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8, 100: 11,
  101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3,
  111: 5, 112: 4, 113: 5, 114: 6,
};

export function getTafsirForAyah(extras: QuranExtras | null, surahId: number, ayahIndex: number): string | null {
  if (!extras?.tafsir) return null;
  const match = extras.tafsir.find((t) => t.surahId === surahId && t.ayahIndex === ayahIndex);
  return match?.text ?? null;
}

export function getTafsirForSurahFirst(extras: QuranExtras | null, surahId: number): TafsirAyah | null {
  if (!extras?.tafsir) return null;
  return extras.tafsir.find((t) => t.surahId === surahId) ?? null;
}

/** Convenience: the English translation of the first ayah of a surah for
 *  quick-row previews in the Quran list. */
export function getEnglishRowPreview(extras: QuranExtras | null, surahId: number): string | null {
  const text = getEnglishText(extras, globalAyahNumber(surahId, 1));
  if (!text) return null;
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

/* ─── Sajda verses (15 prostration verses in the Quran) ────────────────── */

export type SajdaVerse = { surahId: number; ayahIndex: number; recommended: boolean };

export const SAJDA_VERSES: SajdaVerse[] = [
  { surahId: 7,   ayahIndex: 206,  recommended: true  },
  { surahId: 13,  ayahIndex: 15,   recommended: true  },
  { surahId: 16,  ayahIndex: 50,   recommended: true  },
  { surahId: 17,  ayahIndex: 109,  recommended: true  },
  { surahId: 19,  ayahIndex: 58,   recommended: true  },
  { surahId: 22,  ayahIndex: 77,   recommended: true  },
  { surahId: 22,  ayahIndex: 26,   recommended: false },
  { surahId: 25,  ayahIndex: 60,   recommended: true  },
  { surahId: 27,  ayahIndex: 26,   recommended: true  },
  { surahId: 32,  ayahIndex: 15,   recommended: false },
  { surahId: 38,  ayahIndex: 24,   recommended: true  },
  { surahId: 41,  ayahIndex: 38,   recommended: true  },
  { surahId: 53,  ayahIndex: 62,   recommended: false },
  { surahId: 84,  ayahIndex: 21,   recommended: true  },
  { surahId: 96,  ayahIndex: 19,   recommended: true  },
];

const SAJDA_SET = new Set(SAJDA_VERSES.map((s) => `${s.surahId}:${s.ayahIndex}`));

export function isSajdaAyah(surahId: number, ayahIndex: number): boolean {
  return SAJDA_SET.has(`${surahId}:${ayahIndex}`);
}

export function sajdaInSurah(surahId: number): SajdaVerse[] {
  return SAJDA_VERSES.filter((s) => s.surahId === surahId);
}

/* ─── Surah thematic info (curated) ────────────────────────────────────── */

export type SurahInfo = {
  /** Main theme in 1-2 Arabic words */
  topic: string;
  /** Approximate rukus count (manual count; some sources differ slightly) */
  rukus: number;
  /** Brief context paragraph in Arabic */
  context: string;
};

const SURAH_INFO: Record<number, SurahInfo> = {
  1: { topic: "الافتتاح", rukus: 1, context: "الفاتحة أمّ الكتاب وأعظم سورة في القرآن، تُسمَّى «أمّ الكتاب» لاشتمالها على معاني القرآن كلّها. فرض قراءتها في كل ركعة." },
  2: { topic: "الإيمان والتشريع", rukus: 40, context: "أطول سور القرآن، نزلت على دفعات طوال عشر سنوات. تتناول أسس الإيمان، وأحكام الأسرة والمجتمع، وقصص الأمم." },
  3: { topic: "العقيدة والجهاد", rukus: 20, context: "مدنية، نزلت بعد بدر. تتناول غزوة أحد ووقائع أخرى، وتُقرر الولاء لله وحده." },
  4: { topic: "الأحكام والقصص", rukus: 25, context: "مدنية، نزلت غالبًا بعد الأحزاب. تجمع بين أحكام الأسرة وقصص الأمم السابقة." },
  5: { topic: "التشريع الكامل", rukus: 16, context: "مدنية، ختمت تشريع الحلال والحرام. سُمّيت «العقود» و«المنقذة»." },
  6: { topic: "العقيدة والرد على المشركين", rukus: 20, context: "مكية، نزلت ردًا على كفار قريش بعد إسلام حمزة وعمر رضي الله عنهما." },
  7: { topic: "القصص والمواعظ", rukus: 24, context: "مكية، تُسمَّى «الميمون» لمجيء حروف مقطعة في أولها. تجمع قصص الأنبياء من آدم إلى موسى." },
  8: { topic: "الانتصار والتمحيص", rukus: 10, context: "مدنية، نزلت في غزوة بدر. سُمّيت أيضًا «بدر»." },
  9: { topic: "البراءة والموعود", rukus: 16, context: "مدنية، آخر ما نزل من السور الطويلة. تُسمَّى «الفاضحة» و«البَراءة» و«المعوذ»." },
  10: { topic: "القصص والوعد", rukus: 11, context: "مكية، تُسمَّى «العُلم» لأنها جامعة لعلوم القرآن. أُعطيت للمسلمين يوم بدر." },
  11: { topic: "العقيدة والتوحيد", rukus: 10, context: "مكية، تُسمَّى «الحمد» لأن بدايتها الحمد لله." },
  12: { topic: "قصة يوسف", rukus: 12, context: "مكية، نزلت بمكة في قوم يتحدّثون عن الأخوة والأنساب. سُمّيت «أحسن القصص»." },
  13: { topic: "الإيمان والوعد", rukus: 6, context: "مدنية، نزلت في أثناء إجلاء بني النضير." },
  14: { topic: "الوعد والوعيد", rukus: 7, context: "مكية، نزلت بمكة. تتحدث عن النعم الكونية وضرورة شكرها." },
  15: { topic: "العاقبة وسُنن الله", rukus: 6, context: "مكية، نزلت قِبَل جمعة بني المُغيرَة من قريش. سُمّيت «الحجر» و«القمّار». فيها آية سجدة." },
  16: { topic: "النعم وسُنن الله", rukus: 16, context: "مكية، نزلت في يهود طلبوا تأخير الحساب. سُمّيت «النحل» لأن الله ضرب فيها مثل النحل." },
  17: { topic: "الإسراء والمعراج", rukus: 12, context: "مكية، نزلت قبل الهجرة. سُمّيت «بني إسرائيل» و«الإسراء» بسبب ذكر رحلة الإسراء." },
  18: { topic: "أهل الكهف وذو القرنين", rukus: 12, context: "مكية، نزلت بعد إسلام أبي جندل. فيها آية الكرسي (الأعظم) وقصة أصحاب الكهف." },
  19: { topic: "قصص الأنبياء", rukus: 6, context: "مكية، نزلت في أناس من المسلمين ارتابوا بقصة موسى وفرعون. فيها آية سجدة." },
  20: { topic: "قصة موسى", rukus: 8, context: "مكية، نزلت في المشركين لما سألوا عن قصة موسى. سُمّيت «طه» لأنها تبدأ بحروف مقطعة." },
  21: { topic: "الأنبياء والعاقبة", rukus: 7, context: "مكية، نزلت بمكة. تتحدث عن الأنبياء الذين أوذوا ثم انتصرت عقيدتهم." },
  22: { topic: "الحج والوعيد", rukus: 10, context: "مدنية، نزلت في قبيلة بني سليم لما حاجّوا المسلمين. فيها آية سجدة." },
  23: { topic: "المؤمنون وصفاتهم", rukus: 6, context: "مكية، نزلت بمكة. تُسمَّى «المنجية» لأنها تُنجي قارئها من عذاب القبر." },
  24: { topic: "النور والأحكام", rukus: 9, context: "مدنية، نزلت في قصة الإفك. سُمّيت «النور» لآية النور الكونية." },
  25: { topic: "الفرقان والوعد", rukus: 6, context: "مكية، نزلت ردًا على المشركين لما طلبوا أن يُفَرق الله بين الحق والباطل. فيها آية سجدة." },
  26: { topic: "العقيدة والشعراء", rukus: 11, context: "مكية، نزلت في مشركي قريش بعد أن اتُّهم النبي ﷺ بأنه شاعر." },
  27: { topic: "النمل وسليمان", rukus: 7, context: "مكية، نزلت بمكة. سُمّيت «النمل» لذكر قصة النملة مع سليمان عليه السلام. فيها آية سجدة." },
  28: { topic: "القصص والوعد", rukus: 9, context: "مكية، نزلت بمكة. تتحدث عن قصص موسى وقارون. سُمّيت «القصص» لكثرة ما فيها من قصص." },
  29: { topic: "العنكبوت والامتحان", rukus: 7, context: "مكية، نزلت في قريش لما أبطأ الوحي. سُمّيت «العنكبوت» لأن الله ضرب فيها مثل العنكبوت." },
  30: { topic: "الروم والوعد", rukus: 6, context: "مكية، نزلت في تشكيك قريش بنبؤة هزيمة الروم." },
  31: { topic: "لقمان والحكمة", rukus: 3, context: "مكية، تتحدث عن قصة لقمان الحكيم ووصيته لابنه." },
  32: { topic: "السجدة وقصة الأمم", rukus: 3, context: "مكية، تتحدث عن خلق آدم وهلاك الأمم المكذبة." },
  33: { topic: "الأحزاب والقتال", rukus: 9, context: "مدنية، نزلت بعد غزوة الخندق. سُمّيت «الأحزاب» لاجتماع الأحزاب على المسلمين." },
  34: { topic: "سبأ وسليمان", rukus: 6, context: "مكية، تتحدث عن ملك سبأ وقصة سليمان عليه السلام." },
  35: { topic: "الملائكة والخلق", rukus: 5, context: "مكية، سُمّيت «الملائكة» لأنها تذكر الملائكة وصفاتهم." },
  36: { topic: "يس والقرآن الحكيم", rukus: 5, context: "مكية، سُمّيت «قلب القرآن» لإعظام النبي ﷺ لها." },
  37: { topic: "الصافات والوعد", rukus: 7, context: "مكية، نزلت بمكة. سُمّيت «الصافات» لذكر الملائكة التي صَفّت في السماء." },
  38: { topic: "ص والأنبياء", rukus: 5, context: "مكية، تبدأ بحرف «ص». فيها قصة داود وسليمان وأيوب عليهم السلام. فيها آية سجدة." },
  39: { topic: "الزمر والوعد", rukus: 8, context: "مكية، نزلت بمكة. تُسمَّى «الغُرف» لذكر الغرف العالية." },
  40: { topic: "غافر والمغفرة", rukus: 9, context: "مكية، تبدأ بقصة فرعون مع موسى. تُسمَّى «المؤمن» و«غافر»." },
  41: { topic: "فُصِّلت والتوحيد", rukus: 6, context: "مكية، نزلت بمكة. تُسمَّى «السجدة» لآية السجدة فيها." },
  42: { topic: "الشورى والتوحيد", rukus: 5, context: "مكية، تُسمَّى «العُسْر» لأنها نزلت بعد «يُسْر»." },
  43: { topic: "الزخرف والمال", rukus: 7, context: "مكية، تتحدث عن زخرفة الدنيا وشُبه الكفار." },
  44: { topic: "الدخان والوعد", rukus: 3, context: "مكية، نزلت بمكة. سُمّيت «الدخان» لأنها تتحدث عن دخان يوم القيامة." },
  45: { topic: "الجاثية والوعد", rukus: 4, context: "مكية، سُمّيت «الجاثية» لأن يوم القيامة تُجثو فيه الأمم." },
  46: { topic: "الأحقاف والعرب", rukus: 4, context: "مكية، نزلت في قُدماء قريش. تتحدث عن عاد قوم هود." },
  47: { topic: "محمد والقتال", rukus: 4, context: "مدنية، نزلت في القتال مع المشركين. تُسمَّى «القتال»." },
  48: { topic: "الفتح والصلح", rukus: 4, context: "مدنية، نزلت قبل صلح الحديبية. سُمّيت «النصر» و«الفتح المبين»." },
  49: { topic: "الحجرات والأخلاق", rukus: 2, context: "مدنية، نزلت في آداب المسلم مع الرسول ﷺ وإخوانه." },
  50: { topic: "ق والقرآن المجيد", rukus: 3, context: "مكية، نزلت بمكة. تتحدث عن يوم القيامة." },
  51: { topic: "الذاريات والتذكير", rukus: 3, context: "مكية، تبدأ بالذاريات أي الرياح." },
  52: { topic: "الطور والوعد", rukus: 2, context: "مكية، تبدأ بذكر الطور." },
  53: { topic: "النجم والشرك", rukus: 3, context: "مكية، نزلت بمكة. فيها آية سجدة." },
  54: { topic: "القمر والوعد", rukus: 3, context: "مكية، نزلت في مشركي قريش. سُمّيت «القمر» لأنها تتحدث عن انشقاق القمر." },
  55: { topic: "الرحمن والنعيم", rukus: 3, context: "مدنية، تتحدث عن نِعَم الله على عباده. أكثر سورة تكررت فيها آية «فبأي آلاء ربكما تكذبان»." },
  56: { topic: "الواقعة والوعد", rukus: 3, context: "مكية، تتحدث عن أهوال يوم القيامة." },
  57: { topic: "الحديد والجهاد", rukus: 4, context: "مدنية، تتحدث عن فضل الإنفاق في سبيل الله." },
  58: { topic: "المجادلة والطلاق", rukus: 3, context: "مدنية، نزلت في قصة المرأة التي جادلت النبي ﷺ." },
  59: { topic: "الحشر والصحابة", rukus: 3, context: "مدنية، نزلت في إجلاء بني النضير." },
  60: { topic: "الممتحنة والولاء", rukus: 2, context: "مدنية، نزلت في الحلفاء لما ظنُّوا أنهم منافقون." },
  61: { topic: "الصف والجهاد", rukus: 2, context: "مدنية، نزلت في جماعة أرادوا أن يُصلحوا أمرَهم." },
  62: { topic: "الجمعة والوعد", rukus: 2, context: "مدنية، تُسمَّى «الجمعة» لذكر صلاة الجمعة." },
  63: { topic: "المنافقون والتحذير", rukus: 2, context: "مدنية، تُسمَّى «المنافقون» لذكر صفاتهم." },
  64: { topic: "التغابن والوعد", rukus: 2, context: "مدنية، تتحدث عن يوم الجمع بين الخلق." },
  65: { topic: "الطلاق والطلاق", rukus: 2, context: "مدنية، تتحدث عن أحكام العِدَّة والطلاق." },
  66: { topic: "التحريم والمنع", rukus: 2, context: "مدنية، نزلت في تحريم النبي ﷺ على نفسه العسل." },
  67: { topic: "الملك والوعد", rukus: 2, context: "مكية، تُسمَّى «تبارك» و«الملك»." },
  68: { topic: "القلم والوعد", rukus: 2, context: "مكية، نزلت بمكة. تتحدث عن أخلاق النبي ﷺ." },
  69: { topic: "الحاقة والوعد", rukus: 2, context: "مكية، تتحدث عن يوم القيامة." },
  70: { topic: "المعارج والوعد", rukus: 2, context: "مكية، تتحدث عن معارج الملائكة." },
  71: { topic: "نوح والدعوة", rukus: 2, context: "مكية، تتحدث عن قصة نوح مع قومه." },
  72: { topic: "الجن والوحي", rukus: 2, context: "مكية، نزلت بمكة. تتحدث عن سماع الجن للقرآن." },
  73: { topic: "المزمل والقيام", rukus: 2, context: "مكية، نزلت بمكة. تتحدث عن قيام الليل." },
  74: { topic: "المدثر والتبشير", rukus: 2, context: "مكية، تُسمَّى «المدثر» لأنها نزلت بعد المزمل." },
  75: { topic: "القيامة والوعد", rukus: 2, context: "مكية، نزلت في المُكذّبين بيوم القيامة." },
  76: { topic: "الإنسان والجزاء", rukus: 2, context: "مدنية، نزلت في قصة أصحاب اليمين." },
  77: { topic: "المرسلات والوعد", rukus: 2, context: "مكية، تتحدث عن أشراط الساعة." },
  78: { topic: "النبأ والبعث", rukus: 2, context: "مكية، تُسمَّى «النبأ» و«العَمّ» و«المُعَصرات»." },
  79: { topic: "النازعات والوعد", rukus: 2, context: "مكية، تتحدث عن يوم القيامة." },
  80: { topic: "عبس والتذكير", rukus: 1, context: "مكية، نزلت في ابن أم مكتوم رضي الله عنه." },
  81: { topic: "التكوير والقيامة", rukus: 1, context: "مكية، تتحدث عن أهوال يوم القيامة." },
  82: { topic: "الانفطار والوعد", rukus: 1, context: "مكية، تتحدث عن يوم القيامة." },
  83: { topic: "المطففين والوعد", rukus: 1, context: "مكية، تتحدث عن تطفيف المكاييل." },
  84: { topic: "الانشقاق والوعد", rukus: 1, context: "مكية، تتحدث عن يوم القيامة. فيها آية سجدة." },
  85: { topic: "البروج والوعد", rukus: 1, context: "مكية، تتحدث عن أصحاب الأخدود." },
  86: { topic: "الطارق والوعد", rukus: 1, context: "مكية، تتحدث عن النجم الطارق." },
  87: { topic: "الأعلى والتسبيح", rukus: 1, context: "مكية، تتحدث عن تسبيح الله." },
  88: { topic: "الغاشية والوعد", rukus: 1, context: "مكية، تتحدث عن يوم القيامة." },
  89: { topic: "الفجر والوعد", rukus: 1, context: "مكية، تتحدث عن النفس اللوامة." },
  90: { topic: "البلد والتضحية", rukus: 1, context: "مكية، تتحدث عن ابن السبيل." },
  91: { topic: "الشمس والتسبيح", rukus: 1, context: "مكية، تُسمَّى «الشمس وضُحاها»." },
  92: { topic: "الليل والتسبيح", rukus: 1, context: "مكية، تتحدث عن التقوى والفجور." },
  93: { topic: "الضحى والعناية", rukus: 1, context: "مكية، نزلت تسلية للنبي ﷺ بعد انقطاع الوحي." },
  94: { topic: "الشرح والفرج", rukus: 1, context: "مكية، نزلت مع الضحى. تتحدث عن نشر الصدر ورفع الذكر." },
  95: { topic: "التين والوعد", rukus: 1, context: "مكية، تتحدث عن الخلق والتكليف." },
  96: { topic: "العلق والعلم", rukus: 1, context: "مكية، أول ما نزل من القرآن. فيها آية سجدة." },
  97: { topic: "القدر والفضل", rukus: 1, context: "مكية، تتحدث عن ليلة القدر." },
  98: { topic: "البينة والوعد", rukus: 1, context: "مدنية، تتحدث عن أهل الكتاب والمنافقين." },
  99: { topic: "الزلزلة والوعد", rukus: 1, context: "مدنية، تتحدث عن يوم القيامة." },
  100: { topic: "العاديات والقسم", rukus: 1, context: "مكية، تتحدث عن العاديات وهلاك فرعون." },
  101: { topic: "القارعة والوعد", rukus: 1, context: "مكية، تتحدث عن يوم القيامة." },
  102: { topic: "التكاثر والوعظ", rukus: 1, context: "مكية، نزلت بمكة." },
  103: { topic: "العصر والعظة", rukus: 1, context: "مكية، تتحدث عن خسارة كل من لم يتصف بالصفات الأربع." },
  104: { topic: "الهمزة والوعيد", rukus: 1, context: "مكية، تتحدث عن الوعبد لمن يتكلم في أعراض الناس." },
  105: { topic: "الفيل والقصة", rukus: 1, context: "مكية، تتحدث عن قصة أصحاب الفيل." },
  106: { topic: "قريش والقصة", rukus: 1, context: "مكية، تتحدث عن نعمة الله على قريش." },
  107: { topic: "الماعون والعطاء", rukus: 1, context: "مكية، تتحدث عن الدنيا ومتاعها." },
  108: { topic: "الكوثر والفضل", rukus: 1, context: "مكية، نزلت بمكة. أصغر سور القرآن." },
  109: { topic: "الكافرون والبراءة", rukus: 1, context: "مكية، تتحدث عن البراءة من الشرك." },
  110: { topic: "النصر والفتح", rukus: 1, context: "مدنية، آخر سورة كاملة نزلت." },
  111: { topic: "المسد والقصة", rukus: 1, context: "مكية، تتحدث عن أبي لهب وامرأته." },
  112: { topic: "الإخلاص والتوحيد", rukus: 1, context: "مكية، تُسمَّى «التوحيد» و«القلْس». تعدل ثلث القرآن في الأجر." },
  113: { topic: "الفلق والاستعاذة", rukus: 1, context: "مكية، نزلت في سحر لبيد بن الأعصم. تعوُّذ بالله من شرور الخلق." },
  114: { topic: "الناس والاستعاذة", rukus: 1, context: "مكية، نزلت مع الفلق. تعوُّذ بالله من وسوسة الشياطين. آخر سور القرآن." },
};

export function getSurahInfo(surahId: number): SurahInfo | null {
  return SURAH_INFO[surahId] ?? null;
}