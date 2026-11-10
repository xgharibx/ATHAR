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
