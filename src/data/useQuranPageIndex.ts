import { useQuery } from "@tanstack/react-query";
import { loadQuranPageIndex } from "@/data/quranLoad";

/**
 * Returns the pre-built page index as [page, items] tuples (Map is
 * reconstructed at the call site to keep IDB-round-tripped data simple).
 * Cached in IDB so subsequent visits skip the 6236-ayah walk entirely.
 */
export function useQuranPageIndex() {
  return useQuery({
    queryKey: ["quran-page-index"],
    queryFn: loadQuranPageIndex,
    staleTime: 1000 * 60 * 60 * 24,
  });
}