/**
 * «القرآن ٢» — translations of the meanings (Quran.com API v4), one well-known
 * translation per language and a second in English. A surah's translation is
 * kept on the device once read.
 */
import { cached } from "./cache";
import { tafsirParagraphs } from "./tafsir";

export type Q2Translation = { id: number; lang: string; label: string; by: string; dir: "ltr" | "rtl" };

export const Q2_TRANSLATIONS: Q2Translation[] = [
  { id: 20, lang: "en", label: "English", by: "Saheeh International", dir: "ltr" },
  { id: 85, lang: "en", label: "English", by: "M. A. S. Abdel Haleem", dir: "ltr" },
  { id: 31, lang: "fr", label: "Français", by: "Muhammad Hamidullah", dir: "ltr" },
  { id: 27, lang: "de", label: "Deutsch", by: "Frank Bubenheim & Nadeem Elyas", dir: "ltr" },
  { id: 83, lang: "es", label: "Español", by: "Sheikh Isa García", dir: "ltr" },
  { id: 77, lang: "tr", label: "Türkçe", by: "Diyanet İşleri", dir: "ltr" },
  { id: 54, lang: "ur", label: "اردو", by: "مولانا محمد جوناگڑھی", dir: "rtl" },
  { id: 135, lang: "fa", label: "فارسی", by: "IslamHouse.com", dir: "rtl" },
  { id: 33, lang: "id", label: "Bahasa Indonesia", by: "Kementerian Agama", dir: "ltr" },
  { id: 39, lang: "ms", label: "Bahasa Melayu", by: "Abdullah Muhammad Basmeih", dir: "ltr" },
  { id: 161, lang: "bn", label: "বাংলা", by: "Taisirul Quran", dir: "ltr" },
  { id: 122, lang: "hi", label: "हिन्दी", by: "Maulana Azizul Haque al-Umari", dir: "ltr" },
  { id: 45, lang: "ru", label: "Русский", by: "Эльмир Кулиев", dir: "ltr" },
  { id: 56, lang: "zh", label: "中文", by: "马坚", dir: "ltr" },
  { id: 49, lang: "sw", label: "Kiswahili", by: "Ali Muhsin Al-Barwani", dir: "ltr" },
  { id: 32, lang: "ha", label: "Hausa", by: "Abubakar Mahmoud Gumi", dir: "ltr" },
  { id: 46, lang: "so", label: "Soomaali", by: "Mahmud Muhammad Abduh", dir: "ltr" },
  { id: 57, lang: "en", label: "Transliteration", by: "Latin letters", dir: "ltr" },
];

export function getTranslation(id: number | null | undefined): Q2Translation | undefined {
  return Q2_TRANSLATIONS.find((t) => t.id === id);
}

/** A whole surah's translation, one string per ayah (footnote markers removed). */
export function loadSurahTranslation(id: number, s: number): Promise<string[]> {
  return cached(`translation:${id}:${s}`, async () => {
    const res = await fetch(`https://api.quran.com/api/v4/quran/translations/${id}?chapter_number=${s}`);
    if (!res.ok) throw new Error(`translation: HTTP ${res.status}`);
    const body = (await res.json()) as { translations?: Array<{ text?: string }> };
    const list = body.translations ?? [];
    if (!list.length) throw new Error("translation: empty");
    // Footnote markers come as <sup foot_note=…>1</sup>; the tag stripper drops them with their number.
    return list.map((t) => tafsirParagraphs(t.text ?? "").join(" "));
  });
}
