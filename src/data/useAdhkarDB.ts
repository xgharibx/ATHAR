import { useQuery } from "@tanstack/react-query";
import { loadAdhkarDB } from "@/data/load";

export function useAdhkarDB() {
  return useQuery({
    queryKey: ["adhkar-db"],
    queryFn: loadAdhkarDB
  });
}
