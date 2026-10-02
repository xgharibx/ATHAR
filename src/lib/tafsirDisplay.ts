export interface TafsirAyahEntry {
  ayahNumber: number;
  text: string;
}

/** Converts a 1-indexed tafsir array into display entries without its empty slot. */
export function buildTafsirAyahEntries(ayahs: readonly string[]): TafsirAyahEntry[] {
  return ayahs.flatMap((text, index) => {
    const ayahNumber = index;
    if (ayahNumber === 0 || !text?.trim()) return [];
    return [{ ayahNumber, text }];
  });
}
