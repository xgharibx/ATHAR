import { z } from "zod";

export const QuranSurahSchema = z.object({
  id: z.number(),
  name: z.string(),
  englishName: z.string().optional().default(""),
  ayahs: z.array(z.string())
});

export const QuranFileSchema = z.object({
  surahs: z.array(QuranSurahSchema)
});

export const QuranPageMapSchema = z.object({
  totalPages: z.number().int().min(1).default(604),
  map: z.record(z.string(), z.number().int().min(1))
});

export type QuranSurah = z.infer<typeof QuranSurahSchema>;
export type QuranDB = QuranSurah[];
export type QuranPageMap = z.infer<typeof QuranPageMapSchema>;
