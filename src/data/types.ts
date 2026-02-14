import { z } from "zod";

/**
 * Database schema (compatible with the JSON structure used in the user's repo).
 */
export const DhikrItemSchema = z.object({
  text: z.string(),
  benefit: z.string().optional().default(""),
  count: z.union([z.number(), z.string()]).optional().default(1),
  count_description: z.string().optional().default("")
});

export const SectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.array(DhikrItemSchema)
});

// Normalized types for app usage (counts are numbers)
export type DhikrItem = z.infer<typeof DhikrItemSchema> & { count: number };
export type Section = {
  id: string;
  title: string;
  content: DhikrItem[];
};
export type AdhkarDB = {
  sections: Section[];
};

export const AdhkarDBSchema = z.object({
  sections: z.array(SectionSchema)
});

// Helper for parsing raw DB
export type RawAdhkarDB = z.infer<typeof AdhkarDBSchema>;

export type FlatDhikr = {
  key: string; // `${sectionId}:${index}`
  sectionId: string;
  sectionTitle: string;
  index: number;
  text: string;
  benefit?: string;
  count: number;
};

export function coerceCount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const normalized = raw
      .trim()
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const n = parseInt(normalized, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}
