/**
 * The catalogue of «السماع» (public/data/listen/catalog.json, built by
 * tools/listen/build_catalog.py): full surahs from the world's reciters, the
 * golden mujawwad editions, the night prayers of the two Harams, and the
 * tawasheeh of the great munshids. It is loaded only when the listening
 * section opens.
 */
import { SURAH_NAMES } from "@/lib/surahNames";

export type Moshaf = {
  id: number;
  /** Riwaya, e.g. «حفص عن عاصم». */
  r: string;
  /** Style: «مرتّل» | «مجوّد» | «معلّم» | … */
  s: string;
  /** Folder: surah N is `${u}${NNN}.mp3`. */
  u: string;
  /** Surahs present, compressed: "1-114" or "1-3,5,7-9". */
  l: string;
  /** mp3quran's ayah-timing id, when the verses can follow the reciter. */
  t?: number;
};

export type Reciter = { id: number; n: string; m: Moshaf[] };
export type GoldenEntry = { reciter: number; moshaf: number; note: string };
export type QiyamYear = { id: string; city: "makkah" | "madinah"; year: number; u: string; d: Record<string, number> };
export type AlbumTrack = { t: string; u: string; d: number; a?: string };
export type Album = { id: string; title: string; artist: string; tracks: AlbumTrack[]; src: string; pd?: boolean };

export type ListenCatalog = {
  v: number;
  famous: number[];
  reciters: Reciter[];
  golden: GoldenEntry[];
  qiyam: QiyamYear[];
  tawasheeh: Album[];
  sources: Record<string, string>;
};

export type TrackKind = "surah" | "qiyam" | "tawsheeh";

/** Anything the player can play. Plain data, so it can be saved in history and playlists. */
export type ListenTrack = {
  /** "m:{moshaf}:{surah}" | "q:{year id}:{surah}" | "t:{album}:{index}" */
  id: string;
  url: string;
  title: string;
  artist: string;
  album: string;
  kind: TrackKind;
  surah?: number;
  reciterId?: number;
  moshafId?: number;
  /** mp3quran ayah-timing id. */
  timing?: number;
  durationS?: number;
};

let pending: Promise<ListenCatalog> | null = null;

export function loadListenCatalog(): Promise<ListenCatalog> {
  pending ??= fetch(`${import.meta.env.BASE_URL ?? "/"}data/listen/catalog.json`)
    .then((r) => (r.ok ? (r.json() as Promise<ListenCatalog>) : Promise.reject(new Error(`catalog ${r.status}`))))
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

export function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/** "1-3,5,7-9" → [1,2,3,5,7,8,9] */
export function parseSurahList(list: string): number[] {
  const out: number[] = [];
  for (const part of list.split(",")) {
    const [a, b] = part.split("-").map((x) => Number.parseInt(x, 10));
    if (!Number.isFinite(a)) continue;
    const end = Number.isFinite(b) ? b! : a!;
    for (let i = a!; i <= end && i <= 114; i++) out.push(i);
  }
  return out;
}

export function surahName(n: number): string {
  return SURAH_NAMES[n - 1] ?? `سورة ${n}`;
}

const CITY: Record<QiyamYear["city"], string> = { makkah: "الحرم المكي", madinah: "المسجد النبوي" };

export function qiyamTitle(q: Pick<QiyamYear, "city" | "year">): string {
  return `تراويح ${CITY[q.city]} ${arabicDigits(q.year)}هـ`;
}

export function cityName(city: QiyamYear["city"]): string {
  return CITY[city];
}

export function arabicDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]!);
}

export function moshafLabel(m: Moshaf): string {
  return m.r === "حفص عن عاصم" ? m.s : `${m.s}، ${m.r}`;
}

export function surahTrack(reciter: Reciter, moshaf: Moshaf, surah: number): ListenTrack {
  return {
    id: `m:${moshaf.id}:${surah}`,
    url: `${moshaf.u}${pad3(surah)}.mp3`,
    title: `سورة ${surahName(surah)}`,
    artist: reciter.n,
    album: moshafLabel(moshaf),
    kind: "surah",
    surah,
    reciterId: reciter.id,
    moshafId: moshaf.id,
    ...(moshaf.t ? { timing: moshaf.t } : {}),
  };
}

export function qiyamTrack(q: QiyamYear, surah: number): ListenTrack {
  return {
    id: `q:${q.id}:${surah}`,
    url: `${q.u}${pad3(surah)}.mp3`,
    title: `سورة ${surahName(surah)}`,
    artist: q.city === "makkah" ? "أئمة الحرم المكي" : "أئمة المسجد النبوي",
    album: qiyamTitle(q),
    kind: "qiyam",
    surah,
    durationS: q.d[String(surah)],
  };
}

export function albumTrack(album: Album, index: number): ListenTrack | null {
  const t = album.tracks[index];
  if (!t) return null;
  return {
    id: `t:${album.id}:${index}`,
    url: t.u,
    title: t.t,
    artist: t.a ?? album.artist,
    album: album.title,
    kind: "tawsheeh",
    durationS: t.d || undefined,
  };
}

/** The queue for a whole recitation, starting with `from`. */
export function recitationQueue(reciter: Reciter, moshaf: Moshaf, surahs = parseSurahList(moshaf.l)): ListenTrack[] {
  return surahs.map((s) => surahTrack(reciter, moshaf, s));
}

export function findReciter(c: ListenCatalog, id: number): Reciter | undefined {
  return c.reciters.find((r) => r.id === id);
}

export function findMoshaf(c: ListenCatalog, moshafId: number): { reciter: Reciter; moshaf: Moshaf } | null {
  for (const reciter of c.reciters) {
    const moshaf = reciter.m.find((m) => m.id === moshafId);
    if (moshaf) return { reciter, moshaf };
  }
  return null;
}

/** Arabic search that ignores diacritics, hamza forms, ta marbuta and alef maqsura. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Two letters for a reciter's mark when there is no photograph: «عبدالباسط عبدالصمد» → «ع ع». */
export function initials(name: string): string {
  const words = name.replace(/^(الشيخ|شيخ|القارئ)\s+/, "").split(/\s+/).filter(Boolean);
  const first = (w: string) => (w.startsWith("ال") && w.length > 2 ? w[2] : w[0]) ?? "";
  return words.length >= 2 ? `${first(words[0]!)}${first(words[words.length - 1]!)}` : first(words[0] ?? "");
}

/** A stable hue for a name, so each reciter keeps the same colour everywhere. */
export function hueFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return h;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return arabicDigits(h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`);
}

/** «٣ س ١٠ د» / «٢٥ د» for totals of listening time. */
export function formatListened(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${arabicDigits(minutes)} د`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${arabicDigits(h)} س ${arabicDigits(m)} د` : `${arabicDigits(h)} س`;
}

/**
 * «عشوائي من كل القرّاء»: a mix of whole surahs across every reciter and
 * every surah — a random reciter, one of their recitations, one of the surahs
 * it has — never the same reciter twice in a row, nor the same surah twice.
 */
export function randomMix(catalog: Pick<ListenCatalog, "reciters">, count = 80, random: () => number = Math.random): ListenTrack[] {
  const choices = catalog.reciters
    .map((reciter) => ({ reciter, moshafs: reciter.m.map((m) => ({ m, surahs: parseSurahList(m.l) })).filter((x) => x.surahs.length) }))
    .filter((x) => x.moshafs.length);
  if (!choices.length) return [];
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length) % items.length]!;
  const out: ListenTrack[] = [];
  const usedSurahs = new Set<number>();
  let lastReciter = -1;
  for (let guard = 0; out.length < count && guard < count * 20; guard++) {
    const { reciter, moshafs } = pick(choices);
    if (reciter.id === lastReciter && choices.length > 1) continue;
    const { m, surahs } = pick(moshafs);
    const fresh = surahs.filter((n) => !usedSurahs.has(n));
    if (!fresh.length) continue;
    const surah = pick(fresh);
    usedSurahs.add(surah);
    if (usedSurahs.size >= 114) usedSurahs.clear();
    lastReciter = reciter.id;
    out.push(surahTrack(reciter, m, surah));
  }
  return out;
}
