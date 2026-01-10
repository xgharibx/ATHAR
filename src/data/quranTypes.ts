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

export type QuranSurah = z.infer<typeof QuranSurahSchema>;
export type QuranDB = QuranSurah[];
