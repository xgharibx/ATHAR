/**
 * The expected pronunciation of every word, per surah (public/data/quran2/
 * tajweed/NNN.json.gz, from tools/quran2/tajweed-pieces.py): fetched when a
 * surah is first checked, gunzipped on the device.
 */
import type { AyahPieces } from "./imam";

const loads = new Map<number, Promise<AyahPieces[]>>();

async function gunzipJson<T>(res: Response): Promise<T> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Served as it is (a .gz file), or already decoded by a server that set its encoding.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text()) as T;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

/** The file of surah s (1–114), on the app's own origin. */
export function piecesUrl(s: number): string {
  if (!Number.isInteger(s) || s < 1 || s > 114) throw new Error(`tajweed pieces: no surah ${s}`);
  return `${import.meta.env.BASE_URL ?? "/"}data/quran2/tajweed/${String(s).padStart(3, "0")}.json.gz`;
}

export function loadSurahPieces(s: number): Promise<AyahPieces[]> {
  let p = loads.get(s);
  if (!p) {
    p = fetch(piecesUrl(s))
      .then((res) => {
        if (!res.ok) throw new Error(`tajweed pieces ${s}: HTTP ${res.status}`);
        return gunzipJson<AyahPieces[]>(res);
      })
      .catch((error) => {
        loads.delete(s);
        throw error;
      });
    loads.set(s, p);
  }
  return p;
}

/** The four ayahs where Tanzil keeps two words as one (Corpus numbering): quran-transcript's word k → ours. */
const JOINED: Record<string, number> = { "2:181": 3, "8:6": 4, "13:37": 8, "37:130": 3 };

/** Our word number (1-based) for quran-transcript's word index (0-based). */
export function ourWord(s: number, a: number, k: number): number {
  const j = JOINED[`${s}:${a}`];
  if (j && k >= j) return k; // words j and j+1 (1-based) are our word j
  return k + 1;
}
