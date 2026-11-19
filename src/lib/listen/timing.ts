/**
 * The verses that follow the reciter: mp3quran.net publishes, for many
 * recitations, the moment each ayah begins in the surah's recording. The
 * player shows the ayah being recited, like the words of a song, and a tap
 * on an ayah jumps the recitation to it.
 */
export type AyahTiming = { ayah: number; start: number; end: number };

const memory = new Map<string, Promise<AyahTiming[] | null>>();

export function loadAyahTimings(read: number, surah: number): Promise<AyahTiming[] | null> {
  const key = `${read}:${surah}`;
  let pending = memory.get(key);
  if (!pending) {
    pending = fetch(`https://www.mp3quran.net/api/v3/ayat_timing?surah=${surah}&read=${read}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) return null;
        const out: AyahTiming[] = [];
        for (const row of rows as Array<{ ayah?: number; start_time?: number; end_time?: number }>) {
          if (typeof row.ayah === "number" && row.ayah > 0 && typeof row.start_time === "number") {
            out.push({ ayah: row.ayah, start: row.start_time, end: typeof row.end_time === "number" ? row.end_time : row.start_time });
          }
        }
        return out.length ? out : null;
      })
      .catch(() => {
        memory.delete(key);
        return null;
      });
    memory.set(key, pending);
  }
  return pending;
}

/** The ayah being recited at `ms` (the last one that has begun). */
export function ayahAt(timings: AyahTiming[], ms: number): number {
  let lo = 0;
  let hi = timings.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timings[mid]!.start <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 ? timings[found]!.ayah : 0;
}
