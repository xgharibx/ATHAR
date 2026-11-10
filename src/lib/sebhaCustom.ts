/** Returns the stable counter key used for a custom dhikr phrase. */
export function customCounterKey(phrase: string | undefined | null): string {
  const clean = String(phrase ?? "").replace(/\s+/g, " ").trim();
  return clean ? `custom:${clean}` : "custom";
}

/** Custom dhikr shortcuts shown above the saved-phrase list. */
export const QUICK_SEBHA_PHRASES: ReadonlyArray<{ phrase: string; target: number }> = [
  { phrase: "سبحان الله وبحمده", target: 100 },
  { phrase: "سبحان الله العظيم", target: 100 },
  { phrase: "لا حول ولا قوة إلا بالله", target: 33 },
  { phrase: "أستغفر الله", target: 100 },
  { phrase: "اللهم صل على محمد", target: 100 },
  { phrase: "سبحان الله وبحمده سبحان الله العظيم", target: 33 },
  { phrase: "حسبنا الله ونعم الوكيل", target: 33 },
  { phrase: "لا إله إلا الله وحده لا شريك له", target: 33 },
];

export function isQuickSebhaPhrase(phrase: string | undefined | null): boolean {
  const key = customCounterKey(phrase);
  return key !== "custom" && QUICK_SEBHA_PHRASES.some((quick) => customCounterKey(quick.phrase) === key);
}
