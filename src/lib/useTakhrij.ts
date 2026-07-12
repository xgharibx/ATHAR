/**
 * Shared data-fetching for real hadith grading (takhrij) from dorar.net —
 * bundled pre-crawled data first (instant, offline, covers the hadiths
 * people actually open most), live proxy lookup for everything else (full
 * 36k-hadith coverage). Used by every surface that shows a hadith (full
 * reader, curated Library cards) so they all fetch the same way.
 */
import { useEffect, useState } from "react";
import { getTakhrijFor, type DorarTakhrij } from "@/lib/dorarTakhrij";
import { getBundledTakhrij } from "@/lib/dorarTakhrijBundled";

export function useTakhrij(
  bookKey: string | null | undefined,
  n: number | null | undefined,
  matnText: string | null | undefined,
): { takhrij: DorarTakhrij | null; loading: boolean } {
  const [takhrij, setTakhrij] = useState<DorarTakhrij | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setTakhrij(null);
    if (!bookKey || !n || !matnText) return;
    setLoading(true);
    getBundledTakhrij(bookKey, n)
      .then((bundled) => {
        if (!alive) return null;
        // Use the bundled entry only if it actually carries a ruling — an
        // empty pre-crawled entry (nothing found at crawl time) shouldn't
        // block a fresh live lookup with the improved matching.
        if (bundled && (bundled.exact || bundled.others.length > 0)) { setTakhrij(bundled); return null; }
        return getTakhrijFor(bookKey, n, matnText);
      })
      .then((live) => { if (alive && live) setTakhrij(live); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [bookKey, n, matnText]);

  return { takhrij, loading };
}
