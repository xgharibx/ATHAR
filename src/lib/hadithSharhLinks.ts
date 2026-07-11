/**
 * Links a hadith in one of the 9 bundled canonical books to its real
 * explanation on hadeethenc.com, where one exists.
 *
 * hadeethenc has no per-hadith "this is Bukhari #X" field reliable enough to
 * trust (checked directly: its "reference" field is sometimes a clean
 * citation, often just a source bibliography with no number at all). So the
 * mapping here was built offline by matching hadith TEXT instead — each
 * hadeethenc record's title against the actual matn of the 9 bundled book
 * packs — and only kept where the match was unambiguous. Ambiguous or
 * unmatched hadiths are simply absent from this file, not guessed.
 *
 * See the crawl/match script this was generated from for the full method;
 * this module only does the lookup at runtime.
 */
import { publicDataUrl } from "@/data/publicAssetUrl";

let cache: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

async function loadLinks(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (!loading) {
    loading = fetch(publicDataUrl("data/hadith/sharh-links.json"))
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, string>) => {
        cache = data;
        return data;
      })
      .catch(() => ({}));
  }
  return loading;
}

/** hadeethenc hadith id for this book+number, or null if no confident match exists. */
export async function getSharhIdFor(bookKey: string, n: number): Promise<string | null> {
  const links = await loadLinks();
  return links[`${bookKey}:${n}`] ?? null;
}
