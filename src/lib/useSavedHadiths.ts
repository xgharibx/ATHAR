/**
 * Every hadith you kept, as one list: the ones marked or noted in the books
 * and the curated ones you favourited (see SavedHadithList). Each book row
 * carries its own text (hadithCards.ts); a book is loaded only for marks
 * made before rows kept their text.
 */
import * as React from "react";
import { useShallow } from "zustand/react/shallow";
import { useNoorStore } from "@/store/noorStore";
import { useHadithPrefs } from "@/lib/hadithPrefs";
import { savedCardFor } from "@/lib/hadithCards";
import { loadHadithPack } from "@/data/useHadithBook";
import { HADITH_BOOKS_STATIC } from "@/data/hadithTypes";
import { hadithPlaceLabel } from "@/data/hadithNumbers";
import { useIslamicLibraryDB } from "@/data/useIslamicLibraryDB";

export type SavedHadith =
  | { kind: "book"; key: string; bookKey: string; n: number; title: string; color: string; place: string; heading?: string; text: string; bookmarked: boolean; note: string }
  | { kind: "curated"; key: string; collectionId: string; entryId: string; title: string; color: string; heading: string; text: string };

export function useSavedHadiths() {
  const { bookmarks, notes, favorites, toggleBookmark, toggleFavorite } = useNoorStore(useShallow((s) => ({
    bookmarks: s.hadithBookmarks,
    notes: s.hadithNotes,
    favorites: s.libraryFavorites,
    toggleBookmark: s.toggleHadithBookmark,
    toggleFavorite: s.toggleLibraryFavorite,
  })));
  const cards = useHadithPrefs((s) => s.cards);
  const rememberCard = useHadithPrefs((s) => s.rememberCard);
  const library = useIslamicLibraryDB();

  const keys = React.useMemo(() => {
    const set = new Set<string>();
    for (const [k, v] of Object.entries(bookmarks)) if (v) set.add(k);
    for (const [k, v] of Object.entries(notes)) if (v) set.add(k);
    return [...set].filter((k) => /^[a-z]+:\d+(\.\d+)?$/.test(k));
  }, [bookmarks, notes]);

  // Marks made before rows carried their text: load those books once, keep the text.
  const missingBooks = React.useMemo(() => [...new Set(keys.filter((k) => !cards[k]).map((k) => k.split(":")[0]!))], [keys, cards]);
  const [failed, setFailed] = React.useState(false);
  const missingKey = missingBooks.join(",");
  React.useEffect(() => {
    if (!missingKey) return;
    let alive = true;
    Promise.all(missingKey.split(",").map((b) => loadHadithPack(b)))
      .then((packs) => {
        if (!alive) return;
        const known = useHadithPrefs.getState().cards;
        for (const key of keys) {
          if (known[key]) continue;
          const [bookKey, nStr] = key.split(":");
          const pack = packs.find((p) => p.key === bookKey);
          if (!pack) continue;
          const item = pack.hadiths.find((h) => h.n === Number(nStr));
          rememberCard(key, item ? savedCardFor(item) : { r: nStr!, x: "" });
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [missingKey, keys, rememberCard]);

  const items = React.useMemo<SavedHadith[]>(() => {
    const fromBooks: SavedHadith[] = keys
      .map((key) => {
        const [bookKey, nStr] = key.split(":") as [string, string];
        const n = Number(nStr);
        const book = HADITH_BOOKS_STATIC.find((b) => b.key === bookKey);
        const card = cards[key];
        return {
          kind: "book" as const,
          key,
          bookKey,
          n,
          title: book?.title ?? bookKey,
          color: book?.color ?? "var(--accent)",
          place: hadithPlaceLabel({ a: n, r: card?.r }),
          heading: card?.ti,
          text: card?.x ?? "",
          bookmarked: !!bookmarks[key],
          note: notes[key] ?? "",
        };
      })
      .sort((a, b) => (HADITH_BOOKS_STATIC.findIndex((x) => x.key === a.bookKey) - HADITH_BOOKS_STATIC.findIndex((x) => x.key === b.bookKey)) || a.n - b.n);
    const curated: SavedHadith[] = (library.data?.flat ?? [])
      .filter((entry) => favorites[entry.key])
      .map((entry) => ({
        kind: "curated" as const,
        key: entry.key,
        collectionId: entry.collectionId,
        entryId: entry.id,
        title: entry.collectionTitle,
        color: entry.collectionAccent,
        heading: entry.title,
        text: entry.arabic,
      }));
    return [...fromBooks, ...curated];
  }, [keys, cards, bookmarks, notes, favorites, library.data]);

  const loading = missingBooks.length > 0 && !failed;
  const remove = (item: SavedHadith) => {
    if (item.kind === "curated") toggleFavorite(item.collectionId, item.entryId);
    else if (item.bookmarked) toggleBookmark(item.bookKey, item.n);
  };
  return { items, loading, remove };
}
