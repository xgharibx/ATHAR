import { publicDataUrl } from "@/data/publicAssetUrl";

export type QuranEnglishTranslation = Record<number, string[]>;

let translationCachePromise: Promise<QuranEnglishTranslation> | null = null;

export async function loadEnglishTranslationCache(): Promise<QuranEnglishTranslation> {
  if (!translationCachePromise) {
    const pending = fetch(publicDataUrl("data/quran-en-sahih.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Record<string, string[]>>;
      })
      .then((json) => {
        const result: QuranEnglishTranslation = {};
        for (const [surahId, ayahs] of Object.entries(json ?? {})) {
          const numericSurahId = Number(surahId);
          if (!Number.isFinite(numericSurahId) || !Array.isArray(ayahs)) continue;
          const normalized = ayahs.map((ayah) => (typeof ayah === "string" ? ayah : ""));
          result[numericSurahId] = ["", ...normalized];
        }
        return result;
      });
    translationCachePromise = pending;
    try {
      return await pending;
    } catch (error) {
      if (translationCachePromise === pending) translationCachePromise = null;
      throw error;
    }
  }

  return translationCachePromise;
}

export async function getEnglishAyahTranslation(surahId: number, ayahIndex: number): Promise<string> {
  const cache = await loadEnglishTranslationCache();
  return cache[surahId]?.[ayahIndex] ?? "";
}
