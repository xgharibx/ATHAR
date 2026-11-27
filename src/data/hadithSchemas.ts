import { z } from "zod";
import type { HadithBookMeta, HadithPack } from "@/data/hadithTypes";

const HadithSectionSchema = z.object({
  id: z.number().int().nonnegative(),
  title: z.string(),
  first: z.number().finite(),
  last: z.number().finite(),
}).passthrough();

const HadithItemSchema = z.object({
  // Some source editions use decimal display numbers (for example 402.2).
  n: z.number().finite().positive(),
  a: z.union([z.number().finite(), z.string()]),
  s: z.number().int().nonnegative(),
  t: z.string(),
  g: z.array(z.string()),
}).passthrough();

const HadithBookMetaSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  color: z.string().min(1),
  order: z.number().int().positive(),
  grade: z.string().min(1),
  description: z.string(),
  count: z.number().int().nonnegative(),
  sectionCount: z.number().int().nonnegative(),
}).passthrough();

export const HadithBookIndexSchema = z.array(HadithBookMetaSchema).min(1);

export const HadithPackSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  color: z.string().min(1),
  order: z.number().int().positive(),
  grade: z.string().min(1),
  description: z.string(),
  count: z.number().int().nonnegative(),
  sections: z.array(HadithSectionSchema),
  hadiths: z.array(HadithItemSchema).min(1),
}).passthrough();

export function parseHadithIndex(value: unknown): HadithBookMeta[] {
  return HadithBookIndexSchema.parse(value) as HadithBookMeta[];
}

export function parseHadithPack(value: unknown, expectedBookKey?: string): HadithPack {
  const pack = HadithPackSchema.parse(value) as HadithPack;
  if (expectedBookKey && pack.key !== expectedBookKey) {
    throw new Error(`Hadith pack key mismatch: expected ${expectedBookKey}`);
  }
  return pack;
}

/** A book's table of contents: meta, chapters, and [n, chapter, ref?] per hadith (books/{key}.json). */
export const HadithBookTocSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  color: z.string().min(1),
  order: z.number().int().positive(),
  grade: z.string().min(1),
  description: z.string(),
  count: z.number().int().nonnegative(),
  sections: z.array(HadithSectionSchema),
  rows: z.array(z.tuple([z.number().finite().positive(), z.number().int().nonnegative()]).rest(z.string())).min(1),
}).passthrough();

/** One chapter's hadiths (books/{key}/{chapter}.json). */
export const HadithChapterSchema = z.object({
  key: z.string().min(1),
  s: z.number().int().nonnegative(),
  hadiths: z.array(HadithItemSchema).min(1),
}).passthrough();

export type HadithBookToc = Omit<HadithPack, "hadiths"> & { rows: [n: number, chapter: number, ref?: string][] };

export function parseHadithToc(value: unknown, expectedBookKey: string): HadithBookToc {
  const toc = HadithBookTocSchema.parse(value) as unknown as HadithBookToc;
  if (toc.key !== expectedBookKey) throw new Error(`Hadith book key mismatch: expected ${expectedBookKey}`);
  return toc;
}

export function parseHadithChapter(value: unknown, expectedBookKey: string, expectedChapter: number): HadithPack["hadiths"] {
  const chapter = HadithChapterSchema.parse(value);
  if (chapter.key !== expectedBookKey || chapter.s !== expectedChapter) throw new Error(`Hadith chapter mismatch: expected ${expectedBookKey}/${expectedChapter}`);
  return chapter.hadiths as HadithPack["hadiths"];
}
