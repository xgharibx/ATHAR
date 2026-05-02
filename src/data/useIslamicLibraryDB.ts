import { useQuery } from "@tanstack/react-query";
import { ISLAMIC_LIBRARY_DB } from "@/data/librarySeed";
import { IslamicLibraryDBSchema, type FlatLibraryEntry, type IslamicLibraryDB, type LibraryEntry } from "@/data/libraryTypes";
import { stripDiacritics } from "@/lib/arabic";

export type LoadedIslamicLibrary = {
  db: IslamicLibraryDB;
  flat: FlatLibraryEntry[];
  byKey: Map<string, FlatLibraryEntry>;
};

function flattenLibrary(db: IslamicLibraryDB): FlatLibraryEntry[] {
  const flat: FlatLibraryEntry[] = [];
  for (const collection of db.collections) {
    const chapters = new Map(collection.chapters.map((chapter) => [chapter.id, chapter]));
    for (const entry of collection.entries) {
      const chapter = chapters.get(entry.chapterId);
      const searchText = stripDiacritics([
        entry.title,
        entry.arabic,
        entry.narrator,
        entry.source.title,
        entry.source.reference,
        entry.explanation,
        ...entry.tags,
        ...entry.benefits,
        collection.title,
        chapter?.title ?? "",
      ].filter(Boolean).join(" "));
      flat.push({
        ...entry,
        key: `${entry.collectionId}:${entry.id}`,
        collectionTitle: collection.title,
        collectionIcon: collection.icon,
        collectionAccent: collection.accent,
        chapterTitle: chapter?.title ?? "متفرقات",
        searchText,
      });
    }
  }
  return flat;
}

export async function loadIslamicLibraryDB(): Promise<LoadedIslamicLibrary> {
  const db = IslamicLibraryDBSchema.parse(ISLAMIC_LIBRARY_DB);
  const flat = flattenLibrary(db);
  return {
    db,
    flat,
    byKey: new Map(flat.map((entry) => [entry.key, entry])),
  };
}

export function useIslamicLibraryDB() {
  return useQuery({
    queryKey: ["islamic-library-db"],
    queryFn: loadIslamicLibraryDB,
    staleTime: Infinity,
  });
}

export function dorarSearchUrl(entry: Pick<LibraryEntry, "verificationQuery" | "arabic">) {
  const query = entry.verificationQuery || entry.arabic.slice(0, 70);
  return `https://dorar.net/hadith/search?q=${encodeURIComponent(query)}`;
}
