import { arNum } from "@/lib/formatNumber";

/**
 * A number with its noun as Arabic says it: «آية واحدة»، «آيتان»، «٧ آيات»،
 * «٢٨٦ آية» (the noun is plural from three to ten, singular from eleven on,
 * and plural again after hundreds and thousands that end in 3–10).
 */
export type CountForms = {
  one: string;
  two: string;
  few: string;
  many: string;
  /** After a round hundred or thousand («١٠٠ حديث»), when it differs from `many` («حديثًا»). */
  hundred?: string;
};

export const AYAH: CountForms = { one: "آية واحدة", two: "آيتان", few: "آيات", many: "آية" };
export const SURAH: CountForms = { one: "سورة واحدة", two: "سورتان", few: "سور", many: "سورة" };
export const DAY: CountForms = { one: "يوم واحد", two: "يومان", few: "أيام", many: "يومًا", hundred: "يوم" };
export const MINUTE: CountForms = { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقة" };
export const HADITH: CountForms = { one: "حديث واحد", two: "حديثان", few: "أحاديث", many: "حديثًا", hundred: "حديث" };
export const BOOK: CountForms = { one: "كتاب واحد", two: "كتابان", few: "كتب", many: "كتابًا", hundred: "كتاب" };
export const CARD: CountForms = { one: "بطاقة واحدة", two: "بطاقتان", few: "بطاقات", many: "بطاقة" };
export const RESULT: CountForms = { one: "نتيجة واحدة", two: "نتيجتان", few: "نتائج", many: "نتيجة" };

export function countAr(n: number, forms: CountForms): string {
  const v = Math.abs(Math.round(n));
  if (v === 1) return forms.one;
  if (v === 2) return forms.two;
  const lastTwo = v % 100;
  if (lastTwo >= 3 && lastTwo <= 10) return `${arNum(v)} ${forms.few}`;
  if (v >= 100 && lastTwo <= 2) return `${arNum(v)} ${forms.hundred ?? forms.many}`;
  return `${arNum(v)} ${forms.many}`;
}
