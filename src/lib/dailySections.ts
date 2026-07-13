// Every adhkar category resets at Fajr — the ibaadah-day boundary — exactly
// like the morning / evening / sleep adhkar. Whatever you completed today
// starts fresh each new Islamic day, so the counters always reflect *today's*
// remembrance, not an old total that never clears.
//
// The `progress` map (and the DhikrList/DhikrCard callers) only ever hold
// adhkar section ids, so treating every section as a daily section is both
// correct and future-proof: any category added later resets at Fajr too,
// with no allowlist to keep in sync.
//
// (Kept for reference / anything that wants the original core set explicitly.)
export const DAILY_SECTION_IDS = new Set([
  "morning", "evening", "sleep", "post_prayer", "prayer", "salaah",
  "adhan", "toilet", "mosque", "home", "wudu", "food", "hajj", "virtue",
  "misc", "tasabeeh", "quranic_duas", "prophets_duas", "prophetic_duas",
  "jawami_dua", "ruqyah", "khatm_quran", "salawat", "al_mudhaaf",
  "istighfar_100", "multiplied_dhikr", "forgotten_sunnahs", "essentials",
  "istikhara", "friday", "ramadan", "waking", "my_adhkar",
]);

/** True for every adhkar category — they all reset at Fajr. */
export function isDailySection(_sectionId: string): boolean {
  return true;
}
