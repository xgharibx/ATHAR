import { AdhkarDBSchema, type AdhkarDB, type FlatDhikr, coerceCount, type RawAdhkarDB } from "./types";
import { mergeWithPacks } from "./packs";

/**
 * Loads `public/data/adhkar.json` (offline friendly via PWA caching).
 */
export async function loadAdhkarDB(): Promise<{ db: AdhkarDB; flat: FlatDhikr[] }> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/adhkar.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("تعذر تحميل قاعدة الأذكار");
  const json = await res.json();

  const parsed: RawAdhkarDB = AdhkarDBSchema.parse(json);

  // Normalize counts to numbers
  const db: AdhkarDB = {
    sections: parsed.sections.map((s: any) => ({
      ...s,
      content: s.content.map((i: any) => ({
        ...i,
        count: coerceCount(i.count)
      }))
    }))
  };

  const dbWithPacks = mergeWithPacks(db);

  const flat: FlatDhikr[] = [];
  for (const s of dbWithPacks.sections) {
    s.content.forEach((item, idx) => {
      flat.push({
        key: `${s.id}:${idx}`,
        sectionId: s.id,
        sectionTitle: s.title,
        index: idx,
        text: item.text,
        benefit: item.benefit,
        count: item.count
      });
    });
  }

  return { db: dbWithPacks, flat };
}
