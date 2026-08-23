import { useQuery } from "@tanstack/react-query";

import { publicDataUrl } from "@/data/publicAssetUrl";
import type { ShortsIndex } from "@/lib/shortsFeed";

/**
 * The slim shorts index.
 *
 * Deliberately NOT the video library: that is 6.4 MB and 11,953 records, and
 * making the feed parse all of it before it can show one video is the
 * difference between opening instantly and not. shorts.json carries six fields
 * for the ~7,500 clips that qualify — about a fifth of the bytes.
 */
export function useShortsDB() {
  return useQuery<ShortsIndex>({
    queryKey: ["shorts-index"],
    queryFn: async () => {
      const res = await fetch(publicDataUrl("data/shorts.json"));
      // `res.ok` is not enough: the SPA fallback answers an unknown path with
      // index.html and a 200, so a wrong URL looks like success until JSON
      // parsing chokes. Check the shape instead.
      if (!res.ok) throw new Error(`shorts.json ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json?.items)) throw new Error("shorts.json: unexpected shape");
      return json;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
