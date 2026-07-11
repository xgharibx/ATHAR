/**
 * Fast path for dorar.net grading: a pre-crawled bundle of the highest-
 * traffic hadiths (the ones already linked to a sharh explanation, plus the
 * legacy Library selection — see scripts/crawl-dorar-takhrij.mjs) shipped as
 * a static file, so the most commonly opened hadiths show real grading
 * instantly and offline, with zero network round-trip.
 *
 * Everything NOT in this bundle still gets real grading via the live
 * dorarTakhrij.ts proxy lookup — this file only makes the common case fast,
 * it doesn't limit coverage.
 */
import { publicDataUrl } from "@/data/publicAssetUrl";
import type { DorarTakhrij } from "@/lib/dorarTakhrij";

let cache: Record<string, DorarTakhrij> | null = null;
let loading: Promise<Record<string, DorarTakhrij>> | null = null;

async function loadBundle(): Promise<Record<string, DorarTakhrij>> {
  if (cache) return cache;
  if (!loading) {
    loading = fetch(publicDataUrl("data/hadith/dorar-takhrij-bundled.json"))
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, DorarTakhrij>) => {
        cache = data;
        return data;
      })
      .catch(() => ({}));
  }
  return loading;
}

/** Pre-warm the bundle so the first hadith opened doesn't wait on this fetch. */
export function prewarmBundledTakhrij(): void {
  void loadBundle();
}

export async function getBundledTakhrij(bookKey: string, n: number): Promise<DorarTakhrij | null> {
  const bundle = await loadBundle();
  return bundle[`${bookKey}:${n}`] ?? null;
}
