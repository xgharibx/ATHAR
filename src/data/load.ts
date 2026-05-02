import { AdhkarDBSchema, type AdhkarDB, type FlatDhikr, coerceCount, type RawAdhkarDB } from "./types";
import { MY_ADHKAR_SECTION_ID, MY_ADHKAR_TITLE, mergeWithPacks } from "./packs";
import { publicDataUrl } from "./publicAssetUrl";

const SECTION_ORDER = [
  MY_ADHKAR_SECTION_ID,
  "morning",
  "evening",
  "post_prayer",
  "essentials",
  "waking",
  "prayer",
  "salawat",
  "forgotten_sunnahs",
  "adhan",
  "sleep",
  "quranic_duas",
  "prophets_duas",
  "prophetic_duas",
  "jawami_dua",
  "tasabeeh",
  "ruqyah",
  "home",
  "mosque",
  "wudu",
  "food",
  "hajj",
  "virtue",
  "misc",
  "toilet",
] as const;

const SECTION_RANK = new Map<string, number>(SECTION_ORDER.map((sectionId, index) => [sectionId, index]));

function orderedSections(sections: AdhkarDB["sections"]) {
  return sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => {
      const rankA = SECTION_RANK.get(a.section.id) ?? 1000;
      const rankB = SECTION_RANK.get(b.section.id) ?? 1000;
      return rankA - rankB || a.index - b.index;
    })
    .map(({ section }) => section);
}

function ensureMyAdhkarSection(sections: AdhkarDB["sections"]) {
  if (sections.some((section) => section.id === MY_ADHKAR_SECTION_ID)) return sections;
  return [{ id: MY_ADHKAR_SECTION_ID, title: MY_ADHKAR_TITLE, content: [] }, ...sections];
}

/**
 * Loads `public/data/adhkar.json` (offline friendly via PWA caching).
 */
export async function loadAdhkarDB(): Promise<{ db: AdhkarDB; flat: FlatDhikr[] }> {
  const res = await fetch(publicDataUrl("data/adhkar.json"));
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

  const mergedDb = mergeWithPacks(db);
  const dbWithPacks: AdhkarDB = {
    sections: orderedSections(ensureMyAdhkarSection(mergedDb.sections)),
  };

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
        source: item.source,
        source_label: item.source_label,
        source_url: item.source_url,
        minimal: item.minimal,
        count: item.count
      });
    });
  }

  return { db: dbWithPacks, flat };
}
