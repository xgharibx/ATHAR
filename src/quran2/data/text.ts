/**
 * «القرآن ٢» — the Quran text.
 *
 * Source: Tanzil Quran Text (Uthmani, Version 1.1), bundled verbatim in
 * public/data/quran2/tanzil-uthmani.txt with its copyright block (CC BY 3.0,
 * verbatim copies only; tools/scripts/quran2/fetch-tanzil.mjs).
 *
 * Nothing here changes a letter. The text is only cut into words:
 *  - Words are numbered as in the Quranic Arabic Corpus, the numbering the
 *    morphology and the audio timings use. Tanzil writes four of those words as
 *    two («بَعْدَ مَا», «إِلْ يَاسِينَ»); JOINED below keeps them as one word, space included.
 *  - Pause marks (ۖ ۗ ۚ ۛ …) and the sajdah sign (۩) are separate tokens in
 *    Tanzil; they belong to the word before them and are shown after it.
 *  - The rub al-hizb sign (۞) opens the ayah where a hizb quarter starts; it is
 *    kept before the first word.
 *  - Tanzil writes the basmala at the start of the first ayah of 112 surahs; it
 *    is shown as the surah's heading and is not one of the ayah's words.
 */

export type Q2Word = {
  /** 1-based, Quranic Arabic Corpus numbering. */
  n: number;
  /** The word exactly as written (two tokens for the four joined words). */
  text: string;
  /** Pause marks or the sajdah sign written after the word, if any. */
  after?: string;
};

export type Q2Ayah = {
  s: number;
  a: number;
  words: Q2Word[];
  /** A sign written before the first word: the rub al-hizb (۞) where a quarter starts. */
  before?: string;
};
export type Q2Surah = { id: number; basmala?: string; ayahs: Q2Ayah[] };
export type Q2Text = { surahs: Q2Surah[]; notice: string };

/** "surah:ayah" → corpus word number that Tanzil writes as two tokens. */
export const JOINED: Record<string, number> = { "2:181": 3, "8:6": 4, "13:37": 8, "37:130": 3 };

const MARK_TOKEN = /^[\u06D6-\u06ED]+$/u;
const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/gu;

function bare(text: string): string {
  return text.replace(DIACRITICS, "");
}

/** Parse the Tanzil "sura|aya|text" file. Throws if it is not whole. */
export function parseTanzil(raw: string): Q2Text {
  const surahs: Q2Surah[] = [];
  let basmalaBare = "";
  const noticeStart = raw.indexOf("# PLEASE DO NOT REMOVE");
  const notice = noticeStart >= 0 ? raw.slice(noticeStart).trim() : "";

  for (const line of raw.split("\n")) {
    const m = /^(\d+)\|(\d+)\|(.+)$/.exec(line.replace(/\r$/, ""));
    if (!m) continue;
    const s = Number(m[1]);
    const a = Number(m[2]);
    let tokens = m[3]!.replace(/^\uFEFF/, "").split(" ").filter(Boolean);
    let surah = surahs[s - 1];
    if (!surah) {
      surah = { id: s, ayahs: [] };
      surahs[s - 1] = surah;
    }
    if (s === 1 && a === 1) basmalaBare = bare(tokens.join(" "));
    if (a === 1 && s !== 1 && s !== 9) {
      const head = tokens.slice(0, 4).join(" ");
      if (bare(head) !== basmalaBare) throw new Error(`Quran text: surah ${s} does not open with the basmala`);
      surah.basmala = head;
      tokens = tokens.slice(4);
    }
    const words: Q2Word[] = [];
    let before: string | undefined;
    const join = JOINED[`${s}:${a}`];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      if (MARK_TOKEN.test(token)) {
        const last = words[words.length - 1];
        if (last) last.after = last.after ? `${last.after} ${token}` : token;
        else before = before ? `${before} ${token}` : token;
        continue;
      }
      const n = words.length + 1;
      if (join === n && tokens[i + 1]) {
        words.push({ n, text: `${token} ${tokens[i + 1]}` });
        i++;
      } else {
        words.push({ n, text: token });
      }
    }
    surah.ayahs.push(before ? { s, a, words, before } : { s, a, words });
  }
  const total = surahs.reduce((sum, su) => sum + (su?.ayahs.length ?? 0), 0);
  if (surahs.length !== 114 || total !== 6236) throw new Error(`Quran text is incomplete: ${surahs.length} surahs, ${total} ayahs`);
  return { surahs, notice };
}

/** The ayah as written: its words, with their marks, in order. */
export function ayahText(ayah: Q2Ayah): string {
  const words = ayah.words.map((w) => (w.after ? `${w.text} ${w.after}` : w.text)).join(" ");
  return ayah.before ? `${ayah.before} ${words}` : words;
}

let textPromise: Promise<Q2Text> | null = null;

export function loadQuran2Text(): Promise<Q2Text> {
  if (!textPromise) {
    textPromise = fetch(`${import.meta.env.BASE_URL}data/quran2/tanzil-uthmani.txt`)
      .then((res) => {
        if (!res.ok) throw new Error(`Quran text: HTTP ${res.status}`);
        return res.text();
      })
      .then(parseTanzil)
      .catch((error) => {
        textPromise = null;
        throw error;
      });
  }
  return textPromise;
}

export function getAyah(text: Q2Text, s: number, a: number): Q2Ayah | undefined {
  return text.surahs[s - 1]?.ayahs[a - 1];
}
