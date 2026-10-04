import { z } from "zod";
import { getSurahAyahCount } from "@/data/quranSurahCounts";

export const QuranSurahSchema = z.object({
  id: z.number().int().min(1).max(114),
  name: z.string().min(1),
  englishName: z.string().optional().default(""),
  ayahs: z.array(z.string().min(1)).min(1),
});

export const QuranFileSchema = z.object({
  surahs: z.array(QuranSurahSchema).length(114),
}).superRefine((quran, ctx) => {
  const seen = new Set<number>();
  quran.surahs.forEach((surah, index) => {
    if (seen.has(surah.id) || surah.id !== index + 1) {
      ctx.addIssue({ code: "custom", path: ["surahs", index, "id"], message: "Surahs must appear once in Quran order." });
    }
    seen.add(surah.id);
    if (surah.ayahs.length !== getSurahAyahCount(surah.id)) {
      ctx.addIssue({ code: "custom", path: ["surahs", index, "ayahs"], message: "Surah ayah count does not match the canonical Quran." });
    }
  });
});

export const QuranPageMapSchema = z.object({
  totalPages: z.number().int().min(1).default(604),
  map: z.record(z.string(), z.number().int().min(1))
});

export type QuranSurah = z.infer<typeof QuranSurahSchema>;
export type QuranDB = QuranSurah[];
export type QuranPageMap = z.infer<typeof QuranPageMapSchema>;
