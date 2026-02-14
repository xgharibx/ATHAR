import { useQuery } from "@tanstack/react-query";
import { loadQuranPageMap } from "@/data/quranLoad";

export function useQuranPageMap() {
  return useQuery({
    queryKey: ["quran-page-map"],
    queryFn: loadQuranPageMap,
    staleTime: 1000 * 60 * 60 * 24
  });
}
