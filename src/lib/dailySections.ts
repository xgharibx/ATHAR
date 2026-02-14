export const DAILY_SECTION_IDS = new Set([
  "morning",
  "evening",
  "sleep",
  "post_prayer",
  "prayer",
  "adhan",
  "toilet",
  "mosque",
  "home"
]);

export function isDailySection(sectionId: string) {
  return DAILY_SECTION_IDS.has(sectionId);
}
