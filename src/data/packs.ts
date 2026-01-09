import { AdhkarDBSchema, SectionSchema, type AdhkarDB, type Section, coerceCount } from "./types";

const KEY = "noor_data_packs_v1";

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
