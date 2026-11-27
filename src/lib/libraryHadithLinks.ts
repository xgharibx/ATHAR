/**
 * Connects the Islamic Library's curated hadith selections (src/data/
 * hadiths.ts — matn only, no isnad, a generic in-app "benefit" summary) to
 * their real record in the 9 bundled canonical books, so a reader isn't
 * stuck with the thin library card when the full isnad, grading, sharh
 * explanation link, bookmarks, and memo card are one tap away.
 *
 * Built the same way as hadithSharhLinks.ts: matched offline by normalized
 * text against the actual book matn, unambiguous hits only. See
 * public/data/hadith/library-links.json for the generated mapping.
 */
import { useQuery } from "@tanstack/react-query";
import { publicDataUrl } from "@/data/publicAssetUrl";

export type LibraryHadithLink = { bookKey: string; n: number };

// Preference order when a legacy entry matches more than one book (e.g. the
// same hadith appears in both Bukhari and Muslim) — most authoritative first.
const BOOK_PRIORITY = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "nawawi", "qudsi"];

let cache: Record<string, LibraryHadithLink[]> | null = null;
let loading: Promise<Record<string, LibraryHadithLink[]>> | null = null;

async function loadLinks(): Promise<Record<string, LibraryHadithLink[]>> {
  if (cache) return cache;
  if (!loading) {
    loading = fetch(publicDataUrl("data/hadith/library-links.json"))
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, LibraryHadithLink[]>) => {
        cache = data;
        return data;
      })
      .catch(() => ({}));
  }
  return loading;
}

/**
 * Given a Library entry's own id (e.g. "core_1", "muslim_8" — the trailing
 * number is the legacy hadith id in src/data/hadiths.ts), return every real
 * book:number this hadith was matched to, most authoritative first.
 */
export async function getLibraryHadithLinks(entryId: string): Promise<LibraryHadithLink[]> {
  const match = /_(\d+)$/.exec(entryId);
  if (!match) return [];
  const links = await loadLinks();
  const hits = links[match[1]] ?? [];
  return [...hits].sort((a, b) => BOOK_PRIORITY.indexOf(a.bookKey) - BOOK_PRIORITY.indexOf(b.bookKey));
}

/** The book record a curated entry points to (most authoritative first), from a loaded map. */
export function libraryLinkFor(map: Record<string, LibraryHadithLink[]> | undefined, entryId: string): LibraryHadithLink | null {
  const match = /_(\d+)$/.exec(entryId);
  const hits = match && map ? map[match[1]!] : undefined;
  if (!hits?.length) return null;
  return [...hits].sort((a, b) => BOOK_PRIORITY.indexOf(a.bookKey) - BOOK_PRIORITY.indexOf(b.bookKey))[0]!;
}

/** Hook: every curated entry's book records (7 KB, loaded once). */
export function useLibraryHadithLinkMap() {
  return useQuery({ queryKey: ["library-hadith-links"], queryFn: loadLinks, staleTime: Infinity });
}

/** The grade a book record carries; the two Sahihs leave it empty because every hadith in them is sahih. */
export function bookHadithGrade(bookKey: string, grade: string | readonly string[] | undefined): string {
  const g = (Array.isArray(grade) ? grade[0] ?? "" : (grade as string | undefined) ?? "").trim();
  if (g && g !== "-") return g;
  return bookKey === "bukhari" || bookKey === "muslim" ? "sahih" : "";
}
