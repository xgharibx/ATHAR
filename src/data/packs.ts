import { AdhkarDBSchema, SectionSchema, type AdhkarDB, type Section, coerceCount } from "./types";

const KEY = "noor_data_packs_v1";
const MY_ADHKAR_PACK_ID = "my_adhkar_pack";

export const MY_ADHKAR_SECTION_ID = "my_adhkar";
export const MY_ADHKAR_TITLE = "أذكاري";

export type NoorPack = {
  packId: string;
  name: string;
  importedAt: string;
  sections: Section[];
};

export function loadPacks(): NoorPack[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw); // Avoid direct cast until we validate
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((p: any) => {
        // Validate & Validate Schema
        // This might fail if stored data is bad, so we use optional chaining
        // Parse using Zod then normalize
        const rawSections = (p.sections ?? []).map((s: any) => SectionSchema.parse(s));
        const normalizedSections: Section[] = rawSections.map((s: any) => ({
          ...s,
          content: s.content.map((i: any) => ({ ...i, count: coerceCount(i.count) }))
        }));

        return {
          packId: p.packId,
          name: p.name,
          importedAt: p.importedAt,
          sections: normalizedSections
        } as NoorPack;
      })
      .filter((p) => p.packId && p.name);
  } catch {
    return [];
  }
}

export function savePacks(packs: NoorPack[]) {
  localStorage.setItem(KEY, JSON.stringify(packs));
}

export function addCustomDhikrItem(item: { text: string; count: number; benefit?: string; sectionId?: string; sectionTitle?: string }) {
  const text = item.text.trim();
  if (!text) throw new Error("اكتب الذكر أولاً");

  const targetSectionId = item.sectionId?.trim() || MY_ADHKAR_SECTION_ID;
  const targetSectionTitle = targetSectionId === MY_ADHKAR_SECTION_ID
    ? MY_ADHKAR_TITLE
    : item.sectionTitle?.trim() || "إضافاتي";

  const packs = loadPacks();
  const existingIndex = packs.findIndex((pack) =>
    pack.packId === MY_ADHKAR_PACK_ID || pack.sections.some((section) => section.id === MY_ADHKAR_SECTION_ID)
  );

  const nextPacks = [...packs];
  const pack = existingIndex >= 0 ? { ...nextPacks[existingIndex] } : {
    packId: MY_ADHKAR_PACK_ID,
    name: "إضافاتي",
    importedAt: new Date().toISOString(),
    sections: [],
  } satisfies NoorPack;

  const sectionIndex = pack.sections.findIndex((section) => section.id === targetSectionId);
  const section = sectionIndex >= 0 ? { ...pack.sections[sectionIndex] } : {
    id: targetSectionId,
    title: targetSectionTitle,
    content: [],
  } satisfies Section;

  section.title = targetSectionTitle;
  section.content = [
    ...section.content,
    {
      text,
      count: coerceCount(item.count),
      benefit: item.benefit?.trim() ?? "",
      source: "",
      source_label: "",
      source_url: "",
      minimal: false,
      count_description: "",
    },
  ];

  pack.name = "إضافاتي";
  pack.importedAt = new Date().toISOString();
  pack.sections = sectionIndex >= 0
    ? pack.sections.map((current, index) => index === sectionIndex ? section : current)
    : [section, ...pack.sections];

  if (existingIndex >= 0) {
    nextPacks[existingIndex] = pack;
  } else {
    nextPacks.push(pack);
  }

  savePacks(nextPacks);
  return nextPacks;
}

export function removeCustomDhikrItem(sectionId: string, itemIndex: number): NoorPack[] {
  const packs = loadPacks();
  const packIdx = packs.findIndex((p) => p.sections.some((s) => s.id === sectionId));
  if (packIdx < 0) return packs;
  const pack = { ...packs[packIdx] };
  pack.sections = pack.sections.map((s) =>
    s.id !== sectionId ? s : { ...s, content: s.content.filter((_, i) => i !== itemIndex) }
  );
  const nextPacks = [...packs];
  nextPacks[packIdx] = pack;
  savePacks(nextPacks);
  return nextPacks;
}

export function addPackFromJson(json: any, name?: string): NoorPack {
  // Accept either {sections:[...]} (DB) OR {id,title,items:[...]} (section export)
  let sections: Section[] = [];
  
  // Helper to normalize
  const normalizeValues = (rawSecs: any[]) => rawSecs.map((s) => ({
    ...s,
    content: s.content.map((c: any) => ({ ...c, count: coerceCount(c.count) }))
  }));

  if (json?.sections) {
    const rawDb = AdhkarDBSchema.parse(json);
    sections = normalizeValues(rawDb.sections);
  } else if (json?.items && json?.id && json?.title) {
    // Section export shape
    const rawSection = SectionSchema.parse({
      id: json.id,
      title: json.title,
      content: json.items
    });
    sections = normalizeValues([rawSection]);
  } else {
    throw new Error("صيغة الحزمة غير مدعومة");
  }

  const packId = `pack_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  return {
    packId,
    name: name || json?.name || json?.title || "حزمة مستوردة",
    importedAt: new Date().toISOString(),
    sections
  };
}

export function removePack(packId: string) {
  const packs = loadPacks().filter((p) => p.packId !== packId);
  savePacks(packs);
  return packs;
}

export function mergeWithPacks(base: AdhkarDB): AdhkarDB {
  const packs = loadPacks();
  if (!packs.length) return base;

  const existingIds = new Set(base.sections.map((s) => s.id));
  const mergedSections: Section[] = [...base.sections];

  for (const pack of packs) {
    for (const sec of pack.sections) {
      let id = sec.id;
      let title = sec.title;

      const existingSection = mergedSections.find((section) => section.id === id);
      if (existingSection) {
        if (id === MY_ADHKAR_SECTION_ID) {
          existingSection.title = MY_ADHKAR_TITLE;
        }
        existingSection.content = [...existingSection.content, ...sec.content];
        continue;
      }

      if (id === MY_ADHKAR_SECTION_ID) {
        const mySection = mergedSections.find((section) => section.id === MY_ADHKAR_SECTION_ID);
        if (mySection) {
          mySection.title = MY_ADHKAR_TITLE;
          mySection.content = [...mySection.content, ...sec.content];
        } else {
          mergedSections.push({ ...sec, id: MY_ADHKAR_SECTION_ID, title: MY_ADHKAR_TITLE });
          existingIds.add(MY_ADHKAR_SECTION_ID);
        }
        continue;
      }

      // Avoid collisions: if exists, namespace by packId
      if (existingIds.has(id)) {
        id = `${id}__${pack.packId.slice(0, 6)}`;
        title = `${title} (إضافة)`;
      }
      existingIds.add(id);

      mergedSections.push({
        ...sec,
        id,
        title
      });
    }
  }

  return { sections: mergedSections };
}
