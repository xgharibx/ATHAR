import { useQuery } from "@tanstack/react-query";
import { loadQuranDB } from "@/data/quranLoad";

export function useQuranDB() {
  return useQuery({
    queryKey: ["quran-db"],
    queryFn: loadQuranDB,
    staleTime: 1000 * 60 * 60 * 12
  });
}
