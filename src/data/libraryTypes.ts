import { z } from "zod";

export const LibraryGradeSchema = z.enum(["sahih", "hasan", "agreed", "daif", "maudu", "curated"]);
export type LibraryGrade = z.infer<typeof LibraryGradeSchema>;

export const LibraryKindSchema = z.enum(["hadith", "benefit", "guide"]);
export type LibraryKind = z.infer<typeof LibraryKindSchema>;

export const LibrarySourceSchema = z.object({
  title: z.string(),
  reference: z.string().optional().default(""),
  verificationUrl: z.string().optional().default(""),
});

export const LibraryChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
});

export const LibraryEntrySchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  chapterId: z.string(),
  kind: LibraryKindSchema,
  title: z.string(),
  arabic: z.string(),
  narrator: z.string().optional().default(""),
  source: LibrarySourceSchema,
  grade: LibraryGradeSchema.optional().default("curated"),
  tags: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  explanation: z.string().optional().default(""),
  verificationQuery: z.string().optional().default(""),
});

export const LibraryCollectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional().default(""),
  description: z.string(),
  icon: z.string(),
  accent: z.string(),
  sourceNote: z.string(),
  chapters: z.array(LibraryChapterSchema),
  entries: z.array(LibraryEntrySchema),
});

export const IslamicLibraryDBSchema = z.object({
  version: z.literal(1),
  sourcePolicy: z.string(),
  collections: z.array(LibraryCollectionSchema),
});

export type LibrarySource = z.infer<typeof LibrarySourceSchema>;
export type LibraryChapter = z.infer<typeof LibraryChapterSchema>;
export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;
export type LibraryCollection = z.infer<typeof LibraryCollectionSchema>;
export type IslamicLibraryDB = z.infer<typeof IslamicLibraryDBSchema>;

export type FlatLibraryEntry = LibraryEntry & {
  key: string;
  collectionTitle: string;
  collectionIcon: string;
  collectionAccent: string;
  chapterTitle: string;
  searchText: string;
};
