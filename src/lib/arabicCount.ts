import { arNum } from "@/lib/formatNumber";

/**
 * A number with its noun as Arabic says it: «آية واحدة»، «آيتان»، «٧ آيات»،
 * «٢٨٦ آية» (the noun is plural from three to ten, singular from eleven on,
 * and plural again after hundreds and thousands that end in 3–10).
 */
export type CountForms = { one: string; two: string; few: string; many: string };

export const AYAH: CountForms = { one: "آية واحدة", two: "آيتان", few: "آيات", many: "آية" };
export const SURAH: CountForms = { one: "سورة واحدة", two: "سورتان", few: "سور", many: "سورة" };
export const DAY: CountForms = { one: "يوم واحد", two: "يومان", few: "أيام", many: "يومًا" };
export const MINUTE: CountForms = { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقة" };

export function countAr(n: number, forms: CountForms): string {
  const v = Math.abs(Math.round(n));
  if (v === 1) return forms.one;
  if (v === 2) return forms.two;
  const lastTwo = v % 100;
  if (lastTwo >= 3 && lastTwo <= 10) return `${arNum(v)} ${forms.few}`;
  return `${arNum(v)} ${forms.many}`;
}
